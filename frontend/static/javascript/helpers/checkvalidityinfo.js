export function Checkvalid(data){


    const nicknameRe = /^[A-Za-z][A-Za-z0-9._]{2,15}$/;
    const firstNameRe = /^[A-Za-z]{2,30}$/;
    const lastNameRe = /^[A-Za-z]{2,30}$/;
    const emailRe = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,63}$/;

    if (!nicknameRe.test(data.nickname)) {
        return "invalid nickname";
    }
    if (!firstNameRe.test(data.firstName)) {
        return "invalid first name";
    }
    if (!lastNameRe.test(data.lastName)) {
        return "invalid last name";
    }
    if (data.email.length > 254) {
        return "email too long";
    }
    if (!emailRe.test(data.email)) {
        return "invalid email";
    }
     if (isNaN(data.age) || data.age < 10 || data.age > 120) {
        return("invalid age");
      
    }

    if (data.password.length < 6 || data.password.length > 20) {
        return ('password not valid')
    }

    return ""; 
}

