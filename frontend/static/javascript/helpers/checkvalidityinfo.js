export function Checkvalid(data){
    const nickname = data.nickname.trim();
    const firstName = data.firstName.trim();
    const lastName = data.lastName.trim();
    const email = data.email.trim();

    const nicknameRe = /^[A-Za-z][A-Za-z0-9._]{2,15}$/;
    const firstNameRe = /^[A-Za-z]{2,30}$/;
    const lastNameRe = /^[A-Za-z]{2,30}$/;
    const emailRe = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,63}$/;

    if (!nicknameRe.test(nickname)) {
        return "Nickname must be 3 to 16 characters, start with a letter, and only use letters, numbers, dots, or underscores.";
    }
    if (isNaN(data.age) || data.age < 16 || data.age > 100) {
        return "Age must be a number between 16 and 100.";
    }
    if (!firstNameRe.test(firstName)) {
        return "First name must contain only letters and be between 2 and 30 characters.";
    }
    if (!lastNameRe.test(lastName)) {
        return "Last name must contain only letters and be between 2 and 30 characters.";
    }
    if (email.length > 254 || !emailRe.test(email)) {
        return "Please enter a valid email address.";
    }
    if (data.password.length < 6 || data.password.length > 20) {
        return "Password must be between 6 and 20 characters.";
    }

    return "";
}
