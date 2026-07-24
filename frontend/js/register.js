const form = document.getElementById("register-form");
const errorMessage = document.getElementById("error-message");
const submitBtn = document.getElementById("submit-btn");

form.addEventListener("submit", async function (event) {
    event.preventDefault();
    errorMessage.textContent = "";

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!name || !email || !password) {
        errorMessage.textContent = "Please fill in all required fields.";
        return;
    }

    if (password.length < 8) {
        errorMessage.textContent = "Password must be at least 8 characters long.";
        return;
    }

    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Creating workspace...</span>`;

    try {
        const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : "http://127.0.0.1:8000";
        const response = await fetch(baseUrl + "/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
        });

        if (!response.ok) {
            const data = await response.json();
            const msg = data.detail || "Registration failed. Please try again.";
            errorMessage.textContent = msg;
            if (typeof showToast === 'function') showToast(msg, 'error');
            return;
        }

        if (typeof showToast === 'function') showToast("Account created successfully! Please sign in.", 'success');

        setTimeout(() => {
            window.location.href = "login.html";
        }, 600);

    } catch (err) {
        errorMessage.textContent = "Network error. Please check your connection.";
        if (typeof showToast === 'function') showToast("Network error. Please check your connection.", 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
});