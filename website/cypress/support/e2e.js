import "./commands.js";

// A component page embeds a CodePen script; the audit never needs the network.
beforeEach(() => {
	cy.intercept(/codepen\.io/, { statusCode: 204, body: "" });
});

// The browser raises this when a layout settles within a frame; it is not a failure of the page.
Cypress.on("uncaught:exception", (error) => !/ResizeObserver loop/.test(error.message));
