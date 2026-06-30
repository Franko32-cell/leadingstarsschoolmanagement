const Prose = ({ children, className = "" }) => {
  return (
    <div className={`prose prose-slate max-w-none prose-headings:font-display prose-headings:text-navy prose-a:text-gold ${className}`}>
      {children}
    </div>
  );
};

export default Prose;