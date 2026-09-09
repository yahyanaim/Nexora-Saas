const cutText = ({ text, size }: { text: string; size: number }) => {
  if (text?.length <= size) return text;
  return `${text?.slice(0, size)}..`;
};
export default cutText;
