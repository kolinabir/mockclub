const LANGUAGES = [
  "বাংলা",
  "English",
  "Español",
  "हिन्दी",
  "العربية",
  "Português",
  "Français",
  "Bahasa Indonesia",
  "Tiếng Việt",
  "中文",
  "Русский",
  "اردو",
  "Kiswahili",
  "Türkçe",
  "Deutsch",
  "日本語",
  "தமிழ்",
  "Filipino",
];

export function LanguageMarquee() {
  return (
    <section
      aria-label="Languages we match interviews in"
      className="marquee overflow-hidden border-b border-ink/15 bg-card py-5"
    >
      <div className="flex w-max marquee-track">
        {[0, 1].map((copy) => (
          <ul
            key={copy}
            aria-hidden={copy === 1}
            className="flex shrink-0 items-center"
          >
            {LANGUAGES.map((lang) => (
              <li key={lang} className="flex items-center whitespace-nowrap">
                <span className="display px-7 text-2xl font-semibold text-ink/75">
                  {lang}
                </span>
                <span
                  aria-hidden
                  className="size-1.5 rotate-45 bg-vermilion/60"
                />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}
