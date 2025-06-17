// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Image(props: any) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} alt={props.alt || ''} />;
}
