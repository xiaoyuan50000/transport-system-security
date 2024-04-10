const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
        let clientWidth = entry.contentRect.width / 1600;

        clientWidth = clientWidth < 1 ? clientWidth : 1

        $("body").css("zoom", clientWidth)
    }
});

resizeObserver.observe(document.querySelector("html"));