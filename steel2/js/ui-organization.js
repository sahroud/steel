
/* SAHROUD STEEL - Smart Panel Organizer 1.0 */
(function () {
    "use strict";

    const STYLE_ID = "smartPanelOrganizerStyle";

    function addStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement("style");
        style.id = STYLE_ID;

        style.textContent = `
            .panel.smart-organized {
                padding: 0 !important;
                overflow: hidden;
            }

            .panel.smart-organized > details {
                width: 100%;
            }

            .panel.smart-organized summary {
                list-style: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                padding: 13px 16px;
                min-height: 52px;
                color: #123047;
                font-weight: bold;
                background: #f5f9fb;
                user-select: none;
            }

            .panel.smart-organized summary::-webkit-details-marker {
                display: none;
            }

            .panel.smart-organized summary::after {
                content: "＋";
                color: #176b87;
                font-size: 19px;
                font-weight: bold;
            }

            .panel.smart-organized details[open] > summary::after {
                content: "−";
            }

            .panel.smart-organized details[open] > summary {
                border-bottom: 1px solid #d7e1e7;
                background: #edf5f8;
            }

            .panel.smart-organized .smart-panel-title {
                flex: 1;
                min-width: 0;
            }

            .panel.smart-organized .smart-panel-status {
                color: #647783;
                font-size: 11px;
                font-weight: normal;
                white-space: nowrap;
            }

            .panel.smart-organized .smart-panel-content {
                padding: 14px;
            }

            .panel.smart-organized h3 {
                margin: 0;
                font-size: 14px;
            }

            @media (max-width: 650px) {
                .panel.smart-organized summary {
                    padding: 12px;
                }

                .panel.smart-organized .smart-panel-content {
                    padding: 10px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function shouldOpen(title) {
        return /مشخصات پروژه|مشخصات هندسی|شرایط تکیه|بارگذاری مقدماتی|نمایش قاب|عملیات پروژه/.test(title);
    }

    function organize(panel) {
        if (!panel || panel.dataset.smartOrganized === "1") {
            return;
        }

        const heading =
            panel.querySelector(".panel-title h3") ||
            panel.querySelector(":scope > h3");

        if (!heading) return;

        const titleText = heading.textContent.trim();
        if (!titleText) return;

        const titleContainer = heading.closest(".panel-title") ||
            heading;

        const status = titleContainer.querySelector(".status");

        const details = document.createElement("details");
        details.open = shouldOpen(titleText);

        const summary = document.createElement("summary");

        const title = document.createElement("span");
        title.className = "smart-panel-title";
        title.textContent = titleText;

        summary.appendChild(title);

        if (status) {
            const statusText = document.createElement("span");
            statusText.className = "smart-panel-status";
            statusText.textContent = status.textContent.trim();
            summary.appendChild(statusText);
        }

        const content = document.createElement("div");
        content.className = "smart-panel-content";

        const children = Array.from(panel.childNodes);

        children.forEach(node => {
            if (node === titleContainer) return;
            content.appendChild(node);
        });

        details.appendChild(summary);
        details.appendChild(content);

        panel.innerHTML = "";
        panel.appendChild(details);

        panel.classList.add("smart-organized");
        panel.dataset.smartOrganized = "1";
    }

    function scan(root) {
        if (!root) return;

        if (root.matches && root.matches(".panel")) {
            organize(root);
        }

        if (root.querySelectorAll) {
            root.querySelectorAll(".panel").forEach(organize);
        }
    }

    function init() {
        addStyles();

        scan(document);

        // مدیریت پنل‌هایی که ماژول‌های دیگر بعداً می‌سازند
        const observer = new MutationObserver(records => {
            records.forEach(record => {
                record.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        scan(node);
                    }
                });
            });
        });

        observer.observe(document.querySelector("main") || document.body, {
            childList: true,
            subtree: true
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
