const form = document.getElementById("login-form");
const errorMessage = document.getElementById("error-message");
const submitBtn = document.getElementById("submit-btn");

// Redirect if already logged in
if (localStorage.getItem("access_token")) {
    window.location.href = "dashboard.html";
}

form.addEventListener("submit", async function (event) {
    event.preventDefault();
    errorMessage.textContent = "";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
        errorMessage.textContent = "Please provide both email and password.";
        return;
    }

    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Signing in...</span>`;

    try {
        const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : "http://127.0.0.1:8000";
        const response = await fetch(baseUrl + "/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const data = await response.json();
            const msg = data.detail || "Invalid email or password.";
            errorMessage.textContent = msg;
            if (typeof showToast === 'function') showToast(msg, 'error');
            return;
        }

        const data = await response.json();
        localStorage.setItem("access_token", data.access_token);
        
        // Extract username from email for UI personalization
        const namePart = email.split('@')[0];
        const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        
        setUser({
            email: email,
            name: formattedName
        });

        if (typeof showToast === 'function') showToast("Welcome back! Redirecting to workspace...", 'success');
        
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 500);

    } catch (err) {
        errorMessage.textContent = "Network error. Please check your backend connection.";
        if (typeof showToast === 'function') showToast("Network error. Please check your connection.", 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
});