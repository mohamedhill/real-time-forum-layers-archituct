package handlers

import (
	"crypto/sha1"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"errors"
	"io"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

type ChatHandler struct {
	hub *hub
}

type hub struct {
	mu      sync.RWMutex
	clients map[int]*client
}

type client struct {
	id   int
	conn net.Conn
	send chan []byte
	mu   sync.Mutex
}

type message struct {
	To   int    `json:"to"`
	Text string `json:"text"`
}

const wsGUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

func NewChatHandler() *ChatHandler {
	return &ChatHandler{
		hub: &hub{clients: make(map[int]*client)},
	}
}

func (h *ChatHandler) ServeWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrade(w, r)
	if err != nil {
		http.Error(w, "bad websocket", 400)
		return
	}

	// fake userID for demo (replace with session logic)
	userID := int(time.Now().UnixNano())

	c := &client{
		id:   userID,
		conn: conn,
		send: make(chan []byte, 16),
	}

	h.hub.add(c)

	go h.writeLoop(c)
	h.readLoop(c)
}

func (h *ChatHandler) readLoop(c *client) {
	defer func() {
		h.hub.remove(c.id)
		close(c.send)
		c.conn.Close()
	}()

	for {
		data, op, err := readFrame(c.conn)
		if err != nil {
			return
		}

		if op == 0x8 { // close
			return
		}

		if op == 0x1 { // text
			var msg message
			if json.Unmarshal(data, &msg) != nil {
				continue
			}

			out, _ := json.Marshal(msg)
			h.hub.send(msg.To, out)
		}
	}
}

func (h *ChatHandler) writeLoop(c *client) {
	ticker := time.NewTicker(20 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.send:
			if !ok {
				return
			}
			writeSafe(c, 0x1, msg)

		case <-ticker.C:
			writeSafe(c, 0x9, []byte("ping"))
		}
	}
}

func (h *hub) add(c *client) {
	h.mu.Lock()
	h.clients[c.id] = c
	h.mu.Unlock()
}

func (h *hub) remove(id int) {
	h.mu.Lock()
	delete(h.clients, id)
	h.mu.Unlock()
}

func (h *hub) send(id int, msg []byte) {
	h.mu.RLock()
	c := h.clients[id]
	h.mu.RUnlock()
	if c == nil {
		return
	}

	select {
	case c.send <- msg:
	default:
	}
}

func upgrade(w http.ResponseWriter, r *http.Request) (net.Conn, error) {
	if !strings.Contains(strings.ToLower(r.Header.Get("Connection")), "upgrade") ||
		!strings.EqualFold(r.Header.Get("Upgrade"), "websocket") {
		return nil, errors.New("not websocket")
	}

	key := r.Header.Get("Sec-WebSocket-Key")
	if key == "" {
		return nil, errors.New("no key")
	}

	hj, ok := w.(http.Hijacker)
	if !ok {
		return nil, errors.New("no hijack")
	}

	conn, rw, err := hj.Hijack()
	if err != nil {
		return nil, err
	}

	accept := computeKey(key)

	resp := "HTTP/1.1 101 Switching Protocols\r\n" +
		"Upgrade: websocket\r\n" +
		"Connection: Upgrade\r\n" +
		"Sec-WebSocket-Accept: " + accept + "\r\n\r\n"

	rw.WriteString(resp)
	rw.Flush()

	return conn, nil
}

func computeKey(key string) string {
	sum := sha1.Sum([]byte(key + wsGUID))
	return base64.StdEncoding.EncodeToString(sum[:])
}

func readFrame(conn net.Conn) ([]byte, byte, error) {
	h := make([]byte, 2)
	if _, err := io.ReadFull(conn, h); err != nil {
		return nil, 0, err
	}

	fin := h[0]&0x80 != 0
	if !fin {
		return nil, 0, errors.New("fragmented not supported")
	}

	op := h[0] & 0x0F
	masked := h[1]&0x80 != 0
	l := int(h[1] & 0x7F)

	if l == 126 {
		ext := make([]byte, 2)
		io.ReadFull(conn, ext)
		l = int(binary.BigEndian.Uint16(ext))
	}

	mask := make([]byte, 4)
	if masked {
		io.ReadFull(conn, mask)
	}

	data := make([]byte, l)
	io.ReadFull(conn, data)

	if masked {
		for i := range data {
			data[i] ^= mask[i%4]
		}
	}

	return data, op, nil
}

func writeSafe(c *client, op byte, data []byte) {
	c.mu.Lock()
	defer c.mu.Unlock()

	frame := []byte{0x80 | op, byte(len(data))}
	frame = append(frame, data...)
	c.conn.Write(frame)
}
