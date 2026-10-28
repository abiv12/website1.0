document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById("footer-placeholder");

    if (!container) return;

    try {
        const response = await fetch("./footer.html");

        if (!response.ok) {
            throw new Error("Could not load footer");
        }

        container.innerHTML = await response.text();
    } catch (error) {
        console.error("Footer loading failed:", error);
    }
});