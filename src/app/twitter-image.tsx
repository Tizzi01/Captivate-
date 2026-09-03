/* X reads og:image when there is no twitter:image, so this is belt and braces
 * rather than strictly needed. It also makes Next emit
 * twitter:card=summary_large_image, which is what turns the preview there from
 * a thumbnail beside the text into the full width card. Same image either
 * way. */
export { default, alt, size, contentType } from "./opengraph-image";
