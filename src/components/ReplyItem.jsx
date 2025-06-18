function ReplyItem({ reply }) {
  return (
    <div className="reply-item">
      <p>{reply.text}</p>
    </div>
  );
}

export default ReplyItem;