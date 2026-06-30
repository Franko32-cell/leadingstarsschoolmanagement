import Container from "./Container";

const PageHeader = ({ eyebrow, title, description, bgClass = "bg-cream" }) => {
  return (
    <section className={`${bgClass} py-16 md:py-24`}>
      <Container>
        <div className="max-w-3xl">
          {eyebrow && (
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-4xl font-black leading-tight text-navy md:text-5xl">
            {title}
          </h1>
          {description && (
            <p className="mt-6 text-base leading-8 text-slate-600 md:text-lg">
              {description}
            </p>
          )}
        </div>
      </Container>
    </section>
  );
};

export default PageHeader;