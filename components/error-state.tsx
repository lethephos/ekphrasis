export function ErrorState({ code }: { code: string }) {
  const copy = code === "INVALID_IMAGE" ? "Please choose a valid image file." : code === "UNSUPPORTED_INPUT" ? "That image is too large or unsupported." : "We couldn't complete the identification. Please try again.";
  return <section role="alert"><p>{copy}</p></section>;
}