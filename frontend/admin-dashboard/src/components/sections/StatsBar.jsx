const StatsBar = () => {
  const stats = [
    { value: "2013", label: "Year Established" },
    { value: "500+", label: "Students Enrolled" },
    { value: "15+", label: "Qualified Teachers" },
    { value: "4", label: "Academic Programmes" },
    { value: "98%", label: "Pass Rate" },
  ];

  return (
    <section className="bg-navy py-14">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 text-center md:grid-cols-3 lg:grid-cols-5 md:px-8 lg:px-10">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="font-display text-4xl font-black text-white">
              {stat.value}
            </div>
            <p className="mt-2 text-sm text-white/65">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default StatsBar;