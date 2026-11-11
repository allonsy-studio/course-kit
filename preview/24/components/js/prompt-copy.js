// assets/scripts/prompt-copy.js
var RESET_MS = 2e3;
var COPY = JSON.parse(document.getElementById("copy-data")?.textContent || "{}");
var t = (key) => COPY.promptCopy?.[key] ?? "";
var ICON = {
  copy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M5 15V5a2 2 0 0 1 2-2h10"></path></svg>',
  done: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5 9 17.5 20 6.5"></path></svg>'
};
for (const figure of document.querySelectorAll(".prompt[data-copyable]")) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "prompt-copy";
  button.title = t("copyThisPrompt");
  button.setAttribute("aria-label", t("copyThisPrompt"));
  button.innerHTML = `<span data-icon="copy">${ICON.copy}</span><span data-icon="done" hidden>${ICON.done}</span>`;
  const icons = {
    copy: button.querySelector('[data-icon="copy"]'),
    done: button.querySelector('[data-icon="done"]')
  };
  const showIcon = (name) => {
    icons.copy.hidden = name !== "copy";
    icons.done.hidden = name !== "done";
  };
  const status = document.createElement("span");
  status.className = "sr-only";
  status.setAttribute("role", "status");
  let timer;
  button.addEventListener("click", async () => {
    const text = [...figure.querySelectorAll("p")].map((p) => p.textContent.trim()).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      showIcon("done");
      button.setAttribute("aria-label", t("promptCopied"));
      status.textContent = t("promptCopiedToThe");
    } catch {
      const range = document.createRange();
      range.selectNodeContents(figure);
      const selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      button.setAttribute("aria-label", t("promptSelectedPressYour"));
      status.textContent = t("promptSelectedPressYour");
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      showIcon("copy");
      button.setAttribute("aria-label", t("copyThisPrompt"));
      status.textContent = "";
    }, RESET_MS);
  });
  figure.append(button, status);
}
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiYXNzZXRzL3NjcmlwdHMvcHJvbXB0LWNvcHkuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8vIENvcHkgY29udHJvbCBmb3IgYC5wcm9tcHRgIGZpZ3VyZXMgKGEgYGBgcHJvbXB0IGZlbmNlIGluIE1hcmtkb3duKS5cbi8vIEluamVjdGVkIGNsaWVudC1zaWRlLCBhbmQgb25seSBvbnRvIGBkYXRhLWNvcHlhYmxlYCBmaWd1cmVzIFx1MjAxNCB0aGVcbi8vIHByb2hpYml0ZWQgZXhhbXBsZXMgZ2V0IG5vIGNvcHkgY29udHJvbC5cbmNvbnN0IFJFU0VUX01TID0gMjAwMDtcblxuLyoqIFRoZSBwYWdlJ3Mgd29yZGluZywgZnJvbSB0aGUgYCNjb3B5LWRhdGFgIGJsb2NrIHRoZSBsYXlvdXQgcmVuZGVycy4gKi9cbmNvbnN0IENPUFkgPSBKU09OLnBhcnNlKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY29weS1kYXRhXCIpPy50ZXh0Q29udGVudCB8fCBcInt9XCIpO1xuY29uc3QgdCA9IChrZXkpID0+IENPUFkucHJvbXB0Q29weT8uW2tleV0gPz8gXCJcIjtcblxuLy8gRWFjaCBpY29uIGlzIHdyYXBwZWQgaW4gYSA8c3Bhbj4gc28gYGhpZGRlbmAgYWxvbmUgY2FuIHN3aXRjaCB0aGVtIChbaGlkZGVuXVxuLy8gZG9lc24ndCBhcHBseSB0byBTVkcpLlxuY29uc3QgSUNPTiA9IHtcblx0Y29weTogJzxzdmcgd2lkdGg9XCIxNlwiIGhlaWdodD1cIjE2XCIgdmlld0JveD1cIjAgMCAyNCAyNFwiIGZpbGw9XCJub25lXCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiMlwiIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPjxyZWN0IHg9XCI5XCIgeT1cIjlcIiB3aWR0aD1cIjExXCIgaGVpZ2h0PVwiMTFcIiByeD1cIjJcIj48L3JlY3Q+PHBhdGggZD1cIk01IDE1VjVhMiAyIDAgMCAxIDItMmgxMFwiPjwvcGF0aD48L3N2Zz4nLFxuXHRkb25lOiAnPHN2ZyB3aWR0aD1cIjE2XCIgaGVpZ2h0PVwiMTZcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgZmlsbD1cIm5vbmVcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIyXCIgc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+PHBhdGggZD1cIk00IDEyLjUgOSAxNy41IDIwIDYuNVwiPjwvcGF0aD48L3N2Zz4nLFxufTtcblxuZm9yIChjb25zdCBmaWd1cmUgb2YgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5wcm9tcHRbZGF0YS1jb3B5YWJsZV1cIikpIHtcblx0Y29uc3QgYnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcblx0YnV0dG9uLnR5cGUgPSBcImJ1dHRvblwiO1xuXHRidXR0b24uY2xhc3NOYW1lID0gXCJwcm9tcHQtY29weVwiO1xuXHRidXR0b24udGl0bGUgPSB0KFwiY29weVRoaXNQcm9tcHRcIik7XG5cdGJ1dHRvbi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIHQoXCJjb3B5VGhpc1Byb21wdFwiKSk7XG5cdGJ1dHRvbi5pbm5lckhUTUwgPSBgPHNwYW4gZGF0YS1pY29uPVwiY29weVwiPiR7SUNPTi5jb3B5fTwvc3Bhbj48c3BhbiBkYXRhLWljb249XCJkb25lXCIgaGlkZGVuPiR7SUNPTi5kb25lfTwvc3Bhbj5gO1xuXHRjb25zdCBpY29ucyA9IHtcblx0XHRjb3B5OiBidXR0b24ucXVlcnlTZWxlY3RvcignW2RhdGEtaWNvbj1cImNvcHlcIl0nKSxcblx0XHRkb25lOiBidXR0b24ucXVlcnlTZWxlY3RvcignW2RhdGEtaWNvbj1cImRvbmVcIl0nKSxcblx0fTtcblx0Y29uc3Qgc2hvd0ljb24gPSAobmFtZSkgPT4ge1xuXHRcdGljb25zLmNvcHkuaGlkZGVuID0gbmFtZSAhPT0gXCJjb3B5XCI7XG5cdFx0aWNvbnMuZG9uZS5oaWRkZW4gPSBuYW1lICE9PSBcImRvbmVcIjtcblx0fTtcblxuXHQvLyBUaGUgbGFiZWwgY2hhbmdlIGFsb25lIGlzbid0IHJlbGlhYmx5IGFubm91bmNlZCwgc28gbWlycm9yIGl0IGhlcmUuXG5cdGNvbnN0IHN0YXR1cyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpO1xuXHRzdGF0dXMuY2xhc3NOYW1lID0gXCJzci1vbmx5XCI7XG5cdHN0YXR1cy5zZXRBdHRyaWJ1dGUoXCJyb2xlXCIsIFwic3RhdHVzXCIpO1xuXG5cdGxldCB0aW1lcjtcblx0YnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XG5cdFx0Y29uc3QgdGV4dCA9IFsuLi5maWd1cmUucXVlcnlTZWxlY3RvckFsbChcInBcIildLm1hcCgocCkgPT4gcC50ZXh0Q29udGVudC50cmltKCkpLmpvaW4oXCJcXG5cXG5cIik7XG5cdFx0dHJ5IHtcblx0XHRcdGF3YWl0IG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KHRleHQpO1xuXHRcdFx0c2hvd0ljb24oXCJkb25lXCIpO1xuXHRcdFx0YnV0dG9uLnNldEF0dHJpYnV0ZShcImFyaWEtbGFiZWxcIiwgdChcInByb21wdENvcGllZFwiKSk7XG5cdFx0XHRzdGF0dXMudGV4dENvbnRlbnQgPSB0KFwicHJvbXB0Q29waWVkVG9UaGVcIik7XG5cdFx0fSBjYXRjaCB7XG5cdFx0XHQvLyBDbGlwYm9hcmQgZGVuaWVkIChvciBhbiBpbnNlY3VyZSBjb250ZXh0KTogc2VsZWN0IHRoZSB0ZXh0IHNvIHRoZVxuXHRcdFx0Ly8ga2V5Ym9hcmQgc2hvcnRjdXQgc3RpbGwgd29ya3MuXG5cdFx0XHRjb25zdCByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKCk7XG5cdFx0XHRyYW5nZS5zZWxlY3ROb2RlQ29udGVudHMoZmlndXJlKTtcblx0XHRcdGNvbnN0IHNlbGVjdGlvbiA9IGdldFNlbGVjdGlvbigpO1xuXHRcdFx0c2VsZWN0aW9uLnJlbW92ZUFsbFJhbmdlcygpO1xuXHRcdFx0c2VsZWN0aW9uLmFkZFJhbmdlKHJhbmdlKTtcblx0XHRcdGJ1dHRvbi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIHQoXCJwcm9tcHRTZWxlY3RlZFByZXNzWW91clwiKSk7XG5cdFx0XHRzdGF0dXMudGV4dENvbnRlbnQgPSB0KFwicHJvbXB0U2VsZWN0ZWRQcmVzc1lvdXJcIik7XG5cdFx0fVxuXHRcdGNsZWFyVGltZW91dCh0aW1lcik7XG5cdFx0dGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdHNob3dJY29uKFwiY29weVwiKTtcblx0XHRcdGJ1dHRvbi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIHQoXCJjb3B5VGhpc1Byb21wdFwiKSk7XG5cdFx0XHRzdGF0dXMudGV4dENvbnRlbnQgPSBcIlwiO1xuXHRcdH0sIFJFU0VUX01TKTtcblx0fSk7XG5cblx0ZmlndXJlLmFwcGVuZChidXR0b24sIHN0YXR1cyk7XG59XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBR0EsSUFBTSxXQUFXO0FBR2pCLElBQU0sT0FBTyxLQUFLLE1BQU0sU0FBUyxlQUFlLFdBQVcsR0FBRyxlQUFlLElBQUk7QUFDakYsSUFBTSxJQUFJLENBQUMsUUFBUSxLQUFLLGFBQWEsR0FBRyxLQUFLO0FBSTdDLElBQU0sT0FBTztBQUFBLEVBQ1osTUFBTTtBQUFBLEVBQ04sTUFBTTtBQUNQO0FBRUEsV0FBVyxVQUFVLFNBQVMsaUJBQWlCLHdCQUF3QixHQUFHO0FBQ3pFLFFBQU0sU0FBUyxTQUFTLGNBQWMsUUFBUTtBQUM5QyxTQUFPLE9BQU87QUFDZCxTQUFPLFlBQVk7QUFDbkIsU0FBTyxRQUFRLEVBQUUsZ0JBQWdCO0FBQ2pDLFNBQU8sYUFBYSxjQUFjLEVBQUUsZ0JBQWdCLENBQUM7QUFDckQsU0FBTyxZQUFZLDBCQUEwQixLQUFLLElBQUksd0NBQXdDLEtBQUssSUFBSTtBQUN2RyxRQUFNLFFBQVE7QUFBQSxJQUNiLE1BQU0sT0FBTyxjQUFjLG9CQUFvQjtBQUFBLElBQy9DLE1BQU0sT0FBTyxjQUFjLG9CQUFvQjtBQUFBLEVBQ2hEO0FBQ0EsUUFBTSxXQUFXLENBQUMsU0FBUztBQUMxQixVQUFNLEtBQUssU0FBUyxTQUFTO0FBQzdCLFVBQU0sS0FBSyxTQUFTLFNBQVM7QUFBQSxFQUM5QjtBQUdBLFFBQU0sU0FBUyxTQUFTLGNBQWMsTUFBTTtBQUM1QyxTQUFPLFlBQVk7QUFDbkIsU0FBTyxhQUFhLFFBQVEsUUFBUTtBQUVwQyxNQUFJO0FBQ0osU0FBTyxpQkFBaUIsU0FBUyxZQUFZO0FBQzVDLFVBQU0sT0FBTyxDQUFDLEdBQUcsT0FBTyxpQkFBaUIsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxZQUFZLEtBQUssQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUMzRixRQUFJO0FBQ0gsWUFBTSxVQUFVLFVBQVUsVUFBVSxJQUFJO0FBQ3hDLGVBQVMsTUFBTTtBQUNmLGFBQU8sYUFBYSxjQUFjLEVBQUUsY0FBYyxDQUFDO0FBQ25ELGFBQU8sY0FBYyxFQUFFLG1CQUFtQjtBQUFBLElBQzNDLFFBQVE7QUFHUCxZQUFNLFFBQVEsU0FBUyxZQUFZO0FBQ25DLFlBQU0sbUJBQW1CLE1BQU07QUFDL0IsWUFBTSxZQUFZLGFBQWE7QUFDL0IsZ0JBQVUsZ0JBQWdCO0FBQzFCLGdCQUFVLFNBQVMsS0FBSztBQUN4QixhQUFPLGFBQWEsY0FBYyxFQUFFLHlCQUF5QixDQUFDO0FBQzlELGFBQU8sY0FBYyxFQUFFLHlCQUF5QjtBQUFBLElBQ2pEO0FBQ0EsaUJBQWEsS0FBSztBQUNsQixZQUFRLFdBQVcsTUFBTTtBQUN4QixlQUFTLE1BQU07QUFDZixhQUFPLGFBQWEsY0FBYyxFQUFFLGdCQUFnQixDQUFDO0FBQ3JELGFBQU8sY0FBYztBQUFBLElBQ3RCLEdBQUcsUUFBUTtBQUFBLEVBQ1osQ0FBQztBQUVELFNBQU8sT0FBTyxRQUFRLE1BQU07QUFDN0I7IiwKICAibmFtZXMiOiBbXQp9Cg==
