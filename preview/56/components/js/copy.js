// assets/scripts/copy.js
var RESET_MS = 2e3;
var { t } = window.ckCopy;
var ICON = {
  code: {
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M9 18q-.82 0-1.41-.59T7 16V4q0-.83.59-1.41T9 2h9q.82 0 1.41.59T20 4v12q0 .82-.59 1.41T18 18zm0-2h9V4H9zm-4 6q-.83 0-1.41-.59T3 20V6h2v14h11v2z"/></svg>',
    done: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="m9.55 18-5.7-5.7 1.43-1.42 4.27 4.27 9.17-9.17 1.43 1.42z"/></svg>'
  },
  prompt: {
    copy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M5 15V5a2 2 0 0 1 2-2h10"></path></svg>',
    done: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5 9 17.5 20 6.5"></path></svg>'
  }
};
var codeText = (figure) => {
  const lines = [...figure.querySelectorAll(".highlight-line")].map((line) => line.textContent);
  const text = lines.length ? lines : [figure.querySelector("code")?.textContent ?? ""];
  if (figure.dataset.edge !== "shell" || !text.some((line) => line.startsWith("$ "))) return text.join("\n");
  return text.filter((line) => line.startsWith("$ ")).map((line) => line.slice(2)).join("\n");
};
var KINDS = [
  {
    selector: "figure.code-block",
    icons: ICON.code,
    className: "code-copy",
    text: codeText,
    selects: (figure) => figure.querySelector("code") ?? figure,
    label: () => t("code", "copy"),
    copied: () => t("code", "copied"),
    selected: () => t("code", "selected")
  },
  {
    selector: ".prompt[data-copyable]",
    icons: ICON.prompt,
    className: "prompt-copy",
    text: (figure) => [...figure.querySelectorAll("p")].map((p) => p.textContent.trim()).join("\n\n"),
    selects: (figure) => figure,
    label: () => t("promptCopy", "copyThisPrompt"),
    copied: () => t("promptCopy", "promptCopiedToThe"),
    copiedLabel: () => t("promptCopy", "promptCopied"),
    selected: () => t("promptCopy", "promptSelectedPressYour"),
    title: true
  }
];
for (const kind of KINDS) {
  for (const figure of document.querySelectorAll(kind.selector)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = kind.className;
    if (kind.title) button.title = kind.label();
    button.setAttribute("aria-label", kind.label());
    button.innerHTML = kind.icons.copy;
    const status = document.createElement("span");
    status.className = "sr-only";
    status.setAttribute("role", "status");
    let timer;
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(kind.text(figure));
        button.innerHTML = kind.icons.done;
        button.setAttribute("aria-label", (kind.copiedLabel ?? kind.copied)());
        status.textContent = kind.copied();
      } catch {
        const range = document.createRange();
        range.selectNodeContents(kind.selects(figure));
        const selection = getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        if (kind.title) button.setAttribute("aria-label", kind.selected());
        status.textContent = kind.selected();
      }
      clearTimeout(timer);
      timer = setTimeout(() => {
        button.innerHTML = kind.icons.copy;
        button.setAttribute("aria-label", kind.label());
        status.textContent = "";
      }, RESET_MS);
    });
    figure.append(button, status);
  }
}
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiYXNzZXRzL3NjcmlwdHMvY29weS5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLy8gQSBjb3B5IGJ1dHRvbiBmb3IgYW55dGhpbmcgbWFya2VkIGFzIGNvcHlhYmxlOiBhIGNvZGUgYmxvY2sgKGBmaWd1cmUuY29kZS1ibG9ja2ApIGFuZCBhIHByb21wdCAoYC5wcm9tcHRbZGF0YS1jb3B5YWJsZV1gKS5cbi8vIFRoZSBidXR0b24gaXMgYWRkZWQgYnkgdGhpcyBzY3JpcHQgYW5kIGhpZGRlbiBpbiBwcmludC4gRWFjaCBraW5kIG5hbWVzIGl0cyBzZWxlY3RvciwgaXRzIGJ1dHRvbiBjbGFzcywgdGhlIHRleHQgaXQgY29waWVzXG4vLyBhbmQgdGhlIHN0cmluZ3MgaXQgcmVhZHMgZnJvbSB0aGUgYCNjb3B5LWRhdGFgIGJsb2NrLlxuY29uc3QgUkVTRVRfTVMgPSAyMDAwO1xuXG4vKiogVGhlIHBhZ2UncyB3b3JkaW5nLCByZWFkIG9uY2UgYnkgdGhlIHNjcmlwdCB0aGUgbGF5b3V0IHJlbmRlcnMgYWZ0ZXIgYCNjb3B5LWRhdGFgLiAqL1xuY29uc3QgeyB0IH0gPSB3aW5kb3cuY2tDb3B5O1xuXG5jb25zdCBJQ09OID0ge1xuXHRjb2RlOiB7XG5cdFx0Y29weTogJzxzdmcgdmlld0JveD1cIjAgMCAyNCAyNFwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIGZvY3VzYWJsZT1cImZhbHNlXCI+PHBhdGggZmlsbD1cImN1cnJlbnRDb2xvclwiIGQ9XCJNOSAxOHEtLjgyIDAtMS40MS0uNTlUNyAxNlY0cTAtLjgzLjU5LTEuNDFUOSAyaDlxLjgyIDAgMS40MS41OVQyMCA0djEycTAgLjgyLS41OSAxLjQxVDE4IDE4em0wLTJoOVY0SDl6bS00IDZxLS44MyAwLTEuNDEtLjU5VDMgMjBWNmgydjE0aDExdjJ6XCIvPjwvc3ZnPicsXG5cdFx0ZG9uZTogJzxzdmcgdmlld0JveD1cIjAgMCAyNCAyNFwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIGZvY3VzYWJsZT1cImZhbHNlXCI+PHBhdGggZmlsbD1cImN1cnJlbnRDb2xvclwiIGQ9XCJtOS41NSAxOC01LjctNS43IDEuNDMtMS40MiA0LjI3IDQuMjcgOS4xNy05LjE3IDEuNDMgMS40MnpcIi8+PC9zdmc+Jyxcblx0fSxcblx0cHJvbXB0OiB7XG5cdFx0Y29weTogJzxzdmcgd2lkdGg9XCIxNlwiIGhlaWdodD1cIjE2XCIgdmlld0JveD1cIjAgMCAyNCAyNFwiIGZpbGw9XCJub25lXCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiMlwiIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPjxyZWN0IHg9XCI5XCIgeT1cIjlcIiB3aWR0aD1cIjExXCIgaGVpZ2h0PVwiMTFcIiByeD1cIjJcIj48L3JlY3Q+PHBhdGggZD1cIk01IDE1VjVhMiAyIDAgMCAxIDItMmgxMFwiPjwvcGF0aD48L3N2Zz4nLFxuXHRcdGRvbmU6ICc8c3ZnIHdpZHRoPVwiMTZcIiBoZWlnaHQ9XCIxNlwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiBmaWxsPVwibm9uZVwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjJcIiBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIiBhcmlhLWhpZGRlbj1cInRydWVcIj48cGF0aCBkPVwiTTQgMTIuNSA5IDE3LjUgMjAgNi41XCI+PC9wYXRoPjwvc3ZnPicsXG5cdH0sXG59O1xuXG4vKipcbiAqIFRoZSB0ZXh0IGEgcmVhZGVyIG1lYW5zIHRvIGNvcHkgZnJvbSBhIGNvZGUgYmxvY2s6IGV2ZXJ5IGxpbmUsIGFuZCBmb3IgYSB0ZXJtaW5hbCBzZXNzaW9uIG9ubHkgdGhlIGNvbW1hbmRzLCB3aXRob3V0IHRoZWlyIGAkIGAgcHJvbXB0LlxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZmlndXJlXG4gKiBAcmV0dXJucyB7c3RyaW5nfVxuICovXG5jb25zdCBjb2RlVGV4dCA9IChmaWd1cmUpID0+IHtcblx0Y29uc3QgbGluZXMgPSBbLi4uZmlndXJlLnF1ZXJ5U2VsZWN0b3JBbGwoXCIuaGlnaGxpZ2h0LWxpbmVcIildLm1hcCgobGluZSkgPT4gbGluZS50ZXh0Q29udGVudCk7XG5cdGNvbnN0IHRleHQgPSBsaW5lcy5sZW5ndGggPyBsaW5lcyA6IFtmaWd1cmUucXVlcnlTZWxlY3RvcihcImNvZGVcIik/LnRleHRDb250ZW50ID8/IFwiXCJdO1xuXHRpZiAoZmlndXJlLmRhdGFzZXQuZWRnZSAhPT0gXCJzaGVsbFwiIHx8ICF0ZXh0LnNvbWUoKGxpbmUpID0+IGxpbmUuc3RhcnRzV2l0aChcIiQgXCIpKSkgcmV0dXJuIHRleHQuam9pbihcIlxcblwiKTtcblx0cmV0dXJuIHRleHQuZmlsdGVyKChsaW5lKSA9PiBsaW5lLnN0YXJ0c1dpdGgoXCIkIFwiKSkubWFwKChsaW5lKSA9PiBsaW5lLnNsaWNlKDIpKS5qb2luKFwiXFxuXCIpO1xufTtcblxuLyoqIFdoYXQgZWFjaCBjb3B5YWJsZSB0aGluZyBpczogd2hlcmUgdG8gZmluZCBpdCwgdGhlIGJ1dHRvbidzIGNsYXNzLCBpdHMgdGV4dCBhbmQgaXRzIHN0cmluZ3MuICovXG5jb25zdCBLSU5EUyA9IFtcblx0e1xuXHRcdHNlbGVjdG9yOiBcImZpZ3VyZS5jb2RlLWJsb2NrXCIsXG5cdFx0aWNvbnM6IElDT04uY29kZSxcblx0XHRjbGFzc05hbWU6IFwiY29kZS1jb3B5XCIsXG5cdFx0dGV4dDogY29kZVRleHQsXG5cdFx0c2VsZWN0czogKGZpZ3VyZSkgPT4gZmlndXJlLnF1ZXJ5U2VsZWN0b3IoXCJjb2RlXCIpID8/IGZpZ3VyZSxcblx0XHRsYWJlbDogKCkgPT4gdChcImNvZGVcIiwgXCJjb3B5XCIpLFxuXHRcdGNvcGllZDogKCkgPT4gdChcImNvZGVcIiwgXCJjb3BpZWRcIiksXG5cdFx0c2VsZWN0ZWQ6ICgpID0+IHQoXCJjb2RlXCIsIFwic2VsZWN0ZWRcIiksXG5cdH0sXG5cdHtcblx0XHRzZWxlY3RvcjogXCIucHJvbXB0W2RhdGEtY29weWFibGVdXCIsXG5cdFx0aWNvbnM6IElDT04ucHJvbXB0LFxuXHRcdGNsYXNzTmFtZTogXCJwcm9tcHQtY29weVwiLFxuXHRcdHRleHQ6IChmaWd1cmUpID0+IFsuLi5maWd1cmUucXVlcnlTZWxlY3RvckFsbChcInBcIildLm1hcCgocCkgPT4gcC50ZXh0Q29udGVudC50cmltKCkpLmpvaW4oXCJcXG5cXG5cIiksXG5cdFx0c2VsZWN0czogKGZpZ3VyZSkgPT4gZmlndXJlLFxuXHRcdGxhYmVsOiAoKSA9PiB0KFwicHJvbXB0Q29weVwiLCBcImNvcHlUaGlzUHJvbXB0XCIpLFxuXHRcdGNvcGllZDogKCkgPT4gdChcInByb21wdENvcHlcIiwgXCJwcm9tcHRDb3BpZWRUb1RoZVwiKSxcblx0XHRjb3BpZWRMYWJlbDogKCkgPT4gdChcInByb21wdENvcHlcIiwgXCJwcm9tcHRDb3BpZWRcIiksXG5cdFx0c2VsZWN0ZWQ6ICgpID0+IHQoXCJwcm9tcHRDb3B5XCIsIFwicHJvbXB0U2VsZWN0ZWRQcmVzc1lvdXJcIiksXG5cdFx0dGl0bGU6IHRydWUsXG5cdH0sXG5dO1xuXG5mb3IgKGNvbnN0IGtpbmQgb2YgS0lORFMpIHtcblx0Zm9yIChjb25zdCBmaWd1cmUgb2YgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChraW5kLnNlbGVjdG9yKSkge1xuXHRcdGNvbnN0IGJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJidXR0b25cIik7XG5cdFx0YnV0dG9uLnR5cGUgPSBcImJ1dHRvblwiO1xuXHRcdGJ1dHRvbi5jbGFzc05hbWUgPSBraW5kLmNsYXNzTmFtZTtcblx0XHRpZiAoa2luZC50aXRsZSkgYnV0dG9uLnRpdGxlID0ga2luZC5sYWJlbCgpO1xuXHRcdGJ1dHRvbi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIGtpbmQubGFiZWwoKSk7XG5cdFx0YnV0dG9uLmlubmVySFRNTCA9IGtpbmQuaWNvbnMuY29weTtcblx0XHQvLyBUaGUgbGFiZWwgY2hhbmdlIGFsb25lIGlzbid0IHJlbGlhYmx5IGFubm91bmNlZCwgc28gbWlycm9yIGl0IGluIGEgc3RhdHVzIGxpbmUuXG5cdFx0Y29uc3Qgc3RhdHVzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNwYW5cIik7XG5cdFx0c3RhdHVzLmNsYXNzTmFtZSA9IFwic3Itb25seVwiO1xuXHRcdHN0YXR1cy5zZXRBdHRyaWJ1dGUoXCJyb2xlXCIsIFwic3RhdHVzXCIpO1xuXG5cdFx0bGV0IHRpbWVyO1xuXHRcdGJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0YXdhaXQgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQoa2luZC50ZXh0KGZpZ3VyZSkpO1xuXHRcdFx0XHRidXR0b24uaW5uZXJIVE1MID0ga2luZC5pY29ucy5kb25lO1xuXHRcdFx0XHRidXR0b24uc2V0QXR0cmlidXRlKFwiYXJpYS1sYWJlbFwiLCAoa2luZC5jb3BpZWRMYWJlbCA/PyBraW5kLmNvcGllZCkoKSk7XG5cdFx0XHRcdHN0YXR1cy50ZXh0Q29udGVudCA9IGtpbmQuY29waWVkKCk7XG5cdFx0XHR9IGNhdGNoIHtcblx0XHRcdFx0Ly8gQ2xpcGJvYXJkIGRlbmllZCAob3IgYW4gaW5zZWN1cmUgY29udGV4dCk6IHNlbGVjdCB0aGUgdGV4dCBzbyB0aGUga2V5Ym9hcmQgc2hvcnRjdXQgc3RpbGwgd29ya3MuXG5cdFx0XHRcdGNvbnN0IHJhbmdlID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKTtcblx0XHRcdFx0cmFuZ2Uuc2VsZWN0Tm9kZUNvbnRlbnRzKGtpbmQuc2VsZWN0cyhmaWd1cmUpKTtcblx0XHRcdFx0Y29uc3Qgc2VsZWN0aW9uID0gZ2V0U2VsZWN0aW9uKCk7XG5cdFx0XHRcdHNlbGVjdGlvbi5yZW1vdmVBbGxSYW5nZXMoKTtcblx0XHRcdFx0c2VsZWN0aW9uLmFkZFJhbmdlKHJhbmdlKTtcblx0XHRcdFx0aWYgKGtpbmQudGl0bGUpIGJ1dHRvbi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIGtpbmQuc2VsZWN0ZWQoKSk7XG5cdFx0XHRcdHN0YXR1cy50ZXh0Q29udGVudCA9IGtpbmQuc2VsZWN0ZWQoKTtcblx0XHRcdH1cblx0XHRcdGNsZWFyVGltZW91dCh0aW1lcik7XG5cdFx0XHR0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0XHRidXR0b24uaW5uZXJIVE1MID0ga2luZC5pY29ucy5jb3B5O1xuXHRcdFx0XHRidXR0b24uc2V0QXR0cmlidXRlKFwiYXJpYS1sYWJlbFwiLCBraW5kLmxhYmVsKCkpO1xuXHRcdFx0XHRzdGF0dXMudGV4dENvbnRlbnQgPSBcIlwiO1xuXHRcdFx0fSwgUkVTRVRfTVMpO1xuXHRcdH0pO1xuXG5cdFx0Ly8gT24gdGhlIGZpZ3VyZSwgbm90IHRoZSBjYXB0aW9uLCBzbyBhIGNvZGUgYmxvY2sga2VlcHMgaXRzIGNhcHRpb24gYXMgaXRzIGFjY2Vzc2libGUgbmFtZS5cblx0XHRmaWd1cmUuYXBwZW5kKGJ1dHRvbiwgc3RhdHVzKTtcblx0fVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUdBLElBQU0sV0FBVztBQUdqQixJQUFNLEVBQUUsRUFBRSxJQUFJLE9BQU87QUFFckIsSUFBTSxPQUFPO0FBQUEsRUFDWixNQUFNO0FBQUEsSUFDTCxNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsRUFDUDtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLEVBQ1A7QUFDRDtBQU9BLElBQU0sV0FBVyxDQUFDLFdBQVc7QUFDNUIsUUFBTSxRQUFRLENBQUMsR0FBRyxPQUFPLGlCQUFpQixpQkFBaUIsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLEtBQUssV0FBVztBQUM1RixRQUFNLE9BQU8sTUFBTSxTQUFTLFFBQVEsQ0FBQyxPQUFPLGNBQWMsTUFBTSxHQUFHLGVBQWUsRUFBRTtBQUNwRixNQUFJLE9BQU8sUUFB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
