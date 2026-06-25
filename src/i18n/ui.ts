// ---------------------------------------------------------------------------
// Typed UI dictionary — English (reference) and Spanish translations.
// Adding a key to `en` REQUIRES adding the same key to `es`.
// TypeScript strict will catch missing keys at compile time.
// ---------------------------------------------------------------------------

const en = {
  // Navigation
  "nav.about": "About",
  "nav.work": "Work",
  "nav.projects": "Projects",
  "nav.contact": "Contact",
  "nav.menu.aria": "Open Menu",
  "nav.main.aria": "Main",

  // Hero
  "hero.heading": "Computer Engineer",
  "hero.image.alt": "Fabricio Blasich's Profile Picture",

  // About
  "about.heading": "About",
  "about.p1.beforeStrong": "I'm a 23 years old ",
  "about.p1.strong": "Computer Engineering student",
  "about.p1.afterStrong":
    " at UNT with an 8.9/10 GPA and strong foundations in software and systems. I'm obsessed with understanding how everything works behind the scenes.",
  "about.p2.beforeStrong": "I developed my ",
  "about.p2.strong": "Full Stack",
  "about.p2.afterStrong": " skills through ",
  "about.p2.link": "The Odin Project",
  "about.p2.afterLink":
    " and now have a growing focus on backend engineering and infrastructure.",
  "about.p3.beforeSpan": "Fun fact: I was born in Río Gallegos, ",
  "about.p3.span": "Argentina",
  "about.p3.afterSpan": ", so my friends call me 'Pingüino'.",

  // Projects
  "projects.heading": "Projects",

  // ProjectCard
  "projectcard.liveDemo": "Live Demo",
  "projectcard.source.aria": "View source on GitHub",
  "projectcard.image.altPrefix": "Screenshot of ",

  // Experience
  "experience.heading": "Work",

  // Social Media
  "social.github": "Github",
  "social.linkedin": "Linkedin",
  "social.github.aria": "Visit Fabricio's GitHub Profile",
  "social.linkedin.aria": "Visit Fabricio's LinkedIn Profile",
  "social.mail.aria": "Fabricio's mail",

  // 404
  "404.title": "Page Not Found",
  "404.heading": "Page not found",
  "404.body": "The page you are looking for does not exist or has been moved.",
  "404.backHome": "Back to home",

  // Meta / Layout
  "site.title": "Fabricio Blasich's Portfolio",
  "meta.description":
    "Software Architect, GDE & MVP. Building clean, scalable systems with 15+ years of experience. Specializing in architecture, testing, and developer experience.",
  "skip.text": "Skip to content",

  // Language Toggle
  "toggle.language": "Switch to Spanish",

  // ThemeIcon — NOT in dictionary (stays English per REQ-i18n-022)
} as const;

const es = {
  "nav.about": "Sobre mí",
  "nav.work": "Experiencia",
  "nav.projects": "Proyectos",
  "nav.contact": "Contacto",
  "nav.menu.aria": "Abrir menú",
  "nav.main.aria": "Principal",

  "hero.heading": "Ingeniero en Computación",
  "hero.image.alt": "Foto de perfil de Fabricio Blasich",

  "about.heading": "Sobre mí",
  "about.p1.beforeStrong": "Soy ",
  "about.p1.strong": "estudiante de Ingeniería en Computación",
  "about.p1.afterStrong":
    " de 23 años en la UNT con un promedio de 8.9/10 y bases sólidas en software y sistemas. Me obsesiona entender cómo funciona todo detrás de escena.",
  "about.p2.beforeStrong": "Desarrollé mis ",
  "about.p2.strong": "Full Stack",
  "about.p2.afterStrong": " a través de ",
  "about.p2.link": "The Odin Project",
  "about.p2.afterLink":
    " y ahora tengo un enfoque creciente en ingeniería backend e infraestructura.",
  "about.p3.beforeSpan": "Dato curioso: nací en Río Gallegos, ",
  "about.p3.span": "Argentina",
  "about.p3.afterSpan": ", así que mis amigos me llaman 'Pingüino'.",

  "projects.heading": "Proyectos",

  "projectcard.liveDemo": "Demo en vivo",
  "projectcard.source.aria": "Ver código en GitHub",
  "projectcard.image.altPrefix": "Captura de pantalla de ",

  "experience.heading": "Experiencia",

  "social.github": "Github",
  "social.linkedin": "Linkedin",
  "social.github.aria": "Visitar el perfil de GitHub de Fabricio",
  "social.linkedin.aria": "Visitar el perfil de LinkedIn de Fabricio",
  "social.mail.aria": "Correo de Fabricio",

  "404.title": "Página no encontrada",
  "404.heading": "Página no encontrada",
  "404.body": "La página que buscas no existe o ha sido movida.",
  "404.backHome": "Volver al inicio",

  "site.title": "Portfolio de Fabricio Blasich",
  "meta.description":
    "Arquitecto de Software, GDE y MVP. Construyo sistemas limpios y escalables con más de 15 años de experiencia. Especializado en arquitectura, testing y experiencia de desarrollo.",
  "skip.text": "Saltar al contenido",

  "toggle.language": "Cambiar a Inglés",
} as const satisfies Record<keyof typeof en, string>;

export type Locale = keyof typeof ui;
export type UIKey = keyof typeof en;

export const ui = { en, es } as const;

export function t(key: UIKey, locale: Locale): string {
  return ui[locale][key] ?? ui["en"][key];
}

// Re-export for convenience in Astro pages/components
export { getRelativeLocaleUrl } from "astro:i18n";
