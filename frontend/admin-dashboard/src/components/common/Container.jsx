const Container = ({ children, className = "" }) => {
  return (
    <div className={`mx-auto w-full max-w-7xl px-5 md:px-8 lg:px-10 ${className}`}>
      {children}
    </div>
  );
};

export default Container;