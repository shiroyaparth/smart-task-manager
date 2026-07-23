const API_BASE_URL = "http://127.0.0.1:8000";

function handleUnauthorized() {
    localStorage.removeItem("access_token");
    window.location.href = "login.html";
}

function authFetch(path, options = {}) {
    const token = localStorage.getItem("access_token");

    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    };

    if (token) {
        headers["Authorization"] = "Bearer " + token;
    }

    return fetch(API_BASE_URL + path, { ...options, headers }).then(function (response) {
        if (response.status === 401) {
            handleUnauthorized();
        }
        return response;
    });
}