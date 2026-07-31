import { toasts } from "./toasts.svelte";

export function addTestNotifications() {
    toasts.add({
        type: "info",
        title: "Welcome to Viz!",
        message:
            "This is an **info** notification with a *title*. Check out the [documentation](https://viz.com/docs).",
        timeout: 0, // Infinite
        actions: [{ label: "Dismiss", onClick: () => toasts.dismiss(0) }]
    });

    toasts.add({
        type: "success",
        title: "Image Uploaded",
        message: "Your image 'my_photo.jpg' has been successfully uploaded. Go to [My Photos](/photos) to see it.",
        timeout: 0, // Infinite
        actions: [
            { label: "View Photo", onClick: () => alert("Viewing photo!") },
            { label: "Undo", onClick: () => alert("Undo upload!") }
        ]
    });

    toasts.add({
        type: "warning",
        message: "Disk space is running low. Please clear some space. More info at https://viz.com/storage",
        timeout: 0 // Infinite
    });

    toasts.add({
        type: "error",
        title: "Server Error (500)",
        message: "Failed to connect to the server. Please try again later.",
        timeout: 0 // Infinite
    });

    toasts.add({
        type: "info",
        message: "This is a plain info message without a title or actions.",
        timeout: 0 // Infinite
    });
}
