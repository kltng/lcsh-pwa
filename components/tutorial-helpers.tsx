import Image from "next/image";

export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-2xl font-bold mb-6">{title}</h2>
      {children}
    </section>
  );
}

export function Screenshot({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="my-6 rounded-lg border overflow-hidden shadow-sm">
      <Image
        src={src}
        alt={alt}
        width={800}
        height={500}
        className="w-full h-auto"
        loading="lazy"
      />
    </div>
  );
}
