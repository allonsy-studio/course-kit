import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { COPY_DEFAULTS } from "../lib/copy.js";
import { packageRoot } from "../lib/paths.js";
import { PEOPLE, renderInstructor } from "./instructor-render.js";

/** The scope class WebC derives from the component's style: it changes with any CSS edit, so it is not part of the markup being compared. */
const unscoped = (html) => html.replace(/ class="w[a-z0-9]{8}"/, "");

/** The `<section>` alone: the style and script a bare render appends are the component's CSS and JS, which a site gets in its bundles. */
const markup = (html) => /<section[\s\S]*<\/section>/.exec(html)[0];

test("with contact links off, the instructor renders the markup it always has", async () => {
	// Captured from the 0.1.1 component. A change to the off output is a breaking change for every site: regenerate this file only on purpose.
	const golden = JSON.parse(fs.readFileSync(path.join(packageRoot, "test", "fixtures", "instructor-rows.json"), "utf8"));
	for (const [name, person] of Object.entries(PEOPLE)) {
		assert.equal(markup(unscoped(await renderInstructor(person))), markup(golden[name]), `${name}: default variant`);
		assert.equal(markup(unscoped(await renderInstructor(person, '@variant="card"'))), markup(golden[`${name}-card`]), `${name}: card variant`);
	}
});

test("naming the default, `rows`, is the same as saying nothing", async () => {
	const plain = await renderInstructor(PEOPLE.all);
	assert.equal(await renderInstructor({ ...PEOPLE.all, contactLinks: "rows" }), plain);
	assert.equal(await renderInstructor(PEOPLE.all, '@contact-links="rows"'), plain);
});

test("contactLinks icons turns the facts rows into icon links that follow the facts", async () => {
	const html = markup(await renderInstructor({ ...PEOPLE.all, contactLinks: "icons" }));
	assert.match(html, /<ul[^>]*class="links"/);
	assert.equal((html.match(/class="icon-link"/g) ?? []).length, 3);
	const facts = html.slice(html.indexOf('<dl class="facts">'), html.indexOf("</dl>"));
	assert.doesNotMatch(facts, /data-email|href=|Message|Blog|Email/, "no contact row is left in the facts");
	assert.ok(html.indexOf("</dl>") < html.indexOf('class="links"'), "the links come after the facts, so print reads the facts first");
});

test("the tag's contact-links attribute wins over the data, in either direction", async () => {
	assert.match(await renderInstructor(PEOPLE.all, '@contact-links="icons"'), /class="icon-link"/);
	assert.doesNotMatch(await renderInstructor({ ...PEOPLE.all, contactLinks: "icons" }, '@contact-links="rows"'), /class="icon-link"/);
});

test("each icon link has a name from the copy layer, a decorative svg with a size and no fill, and the text print shows", async () => {
	const html = markup(await renderInstructor(PEOPLE.all, '@contact-links="icons"'));
	const links = [...html.matchAll(/<a [^>]*class="icon-link"[^>]*>[\s\S]*?<\/a>/g)].map((match) => match[0]);
	assert.equal(links.length, 3);
	const [email, message, blog] = links;
	assert.match(email, new RegExp(`aria-label="${COPY_DEFAULTS.instructor.email}"`));
	assert.match(message, new RegExp(`aria-label="${COPY_DEFAULTS.instructor.sendMeAMessage}"`));
	assert.match(blog, new RegExp(`aria-label="${COPY_DEFAULTS.instructor.blog}"`));
	assert.match(blog, /title="Blog: sam\.example\.edu\/blog"/);
	assert.match(blog, /<span class="link-text">sam\.example\.edu\/blog<\/span>|class="link-text">sam\.example\.edu\/blog</);
	assert.match(message, /class="link-text">Send me a message</);
	for (const link of links) {
		const svg = /<svg[^>]*>/.exec(link)[0];
		for (const attribute of ['aria-hidden="true"', 'width="24"', 'height="24"', 'fill="none"', 'focusable="false"']) assert.ok(svg.includes(attribute), `${attribute} on ${svg}`);
	}
});

test("the email stays encoded in icon mode: no address in the markup, the decoder's slot beside the icon", async () => {
	const html = await renderInstructor({ ...PEOPLE.all, contactLinks: "icons" });
	assert.ok(!html.includes("sam.example@example.edu"));
	assert.ok(html.includes(`data-email="${Buffer.from("sam.example@example.edu").toString("base64")}"`));
	assert.match(html, /<span[^>]*data-email-text[^>]*><\/span>/);
});

test("each contact method renders alone, and the message link is screen-only beside an address", async () => {
	const only = async (person) => markup(await renderInstructor(person, '@contact-links="icons"'));
	const email = await only({ ...PEOPLE.email });
	assert.equal((email.match(/class="icon-link"/g) ?? []).length, 1);
	const message = await only({ ...PEOPLE.email, email: undefined, contact: "/contact/" });
	assert.equal((message.match(/class="icon-link"/g) ?? []).length, 1);
	assert.doesNotMatch(message, /screen-only/, "with no address the message link prints too");
	const blog = await only({ ...PEOPLE.email, email: undefined, blog: "https://sam.example.edu" });
	assert.match(blog, /class="link-text">sam\.example\.edu</);
	assert.match(await only(PEOPLE.all), /<li class="screen-only">\s*<a href="\/contact\/"/);
	assert.doesNotMatch(await only({ name: "A", office: "B", hours: ["C"] }), /class="links"/, "no contact method, no list");
});

test("the card variant ignores the setting", async () => {
	assert.equal(unscoped(await renderInstructor({ ...PEOPLE.all, contactLinks: "icons" }, '@variant="card"')), unscoped(await renderInstructor(PEOPLE.all, '@variant="card"')));
});

test("instructor.json accepts contactLinks rows or icons and nothing else", () => {
	const schema = JSON.parse(fs.readFileSync(path.join(packageRoot, "schemas", "instructor.schema.json"), "utf8"));
	const ajv = addFormats(new Ajv2020({ allErrors: true, strict: false }));
	const validate = ajv.compile(schema);
	const base = { name: "A", office: "B", hours: ["C"], email: "a@example.edu" };
	assert.ok(validate(base));
	assert.ok(validate({ ...base, contactLinks: "icons" }));
	assert.ok(validate({ ...base, contactLinks: "rows" }));
	assert.ok(!validate({ ...base, contactLinks: "buttons" }));
	assert.ok(!validate({ ...base, contactLinks: true }));
});
