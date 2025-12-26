let complaintHistory = [];

const form = document.getElementById("complaintForm");
const output = document.getElementById("output");

form.addEventListener("submit", function (e) {
    e.preventDefault();

    const title = document.getElementById("title").value;
    const description = document.getElementById("description").value;
    const category = document.getElementById("category").value;

    complaintHistory.push(category);
    const count = complaintHistory.filter(c => c === category).length;

    let priority = "NORMAL";
    let reason = "Issue is new or infrequent.";

    if (count === 2) {
        priority = "MEDIUM";
        reason = "Similar issue reported earlier.";
    } else if (count >= 3) {
        priority = "HIGH";
        reason = "Multiple similar complaints detected.";
    }

    let cls =
        priority === "HIGH" ? "priority-high" :
        priority === "MEDIUM" ? "priority-medium" :
        "priority-normal";

    db.collection("complaints").add({
        title,
        description,
        category,
        priority,
        reason,
        timestamp: new Date()
    }).then(() => {
        output.innerHTML = `
            <h2>AI Decision (MUSE-Inspired)</h2>
            <p><b>Category:</b> ${category}</p>
            <p><b>Priority:</b> <span class="${cls}">${priority}</span></p>
            <p><b>Reason:</b> ${reason}</p>
            <p style="color:#00bfa6;">✔ Saved to Firestore</p>
        `;
        form.reset();
    });
});

