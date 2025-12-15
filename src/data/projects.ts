import type { ImageMetadata } from "astro";
import CvBuilder from "../assets/CvBuilder.png";
import ShoppingCard from "../assets/ShoppingCard.png";
import Battleship from "../assets/Battleship.png";

export type Project = {
  title: string;
  description: string;
  image: ImageMetadata;
  tags: string[];
  githubUrl: string;
  liveUrl?: string;
};

export const PROJECTS: Project[] = [
  {
    title: "CV Builder",
    description:
      "A real-time resume generator built with React and TypeScript, featuring dynamic form state management and client-side PDF export.",
    image: CvBuilder,
    tags: ["React", "TypeScript", "Vite", "html2pdf.js"],
    githubUrl: "https://github.com/archivexblasich/cv-application",
    liveUrl: "https://archivexblasich.github.io/CV-Application/",
  },
  {
    title: "Shopping Cart",
    description:
      "A React-based e-commerce UI featuring dynamic cart management, client-side routing, and real-time product data fetching via the FakeStore API.",
    image: ShoppingCard,
    tags: ["React", "TypeScript", "Vite", "React Router", "CSS Modules"],
    githubUrl: "https://github.com/ArchivexBlasich/Shopping-Cart/tree/main",
    liveUrl: "https://archivexblasich.github.io/Shopping-Cart/"
  },
  {
    title: "Battleship",
    description:
      "Classic Battleship featuring a heuristic opponent, drag-and-drop, and TDD logic using vanilla JS.",
    image: Battleship,
    tags: ["JavaScript", "Jest", "Webpack", "CSS"],
    githubUrl: "https://github.com/archivexblasich/battleship",
    liveUrl: "https://archivexblasich.github.io/Battleship/",
  },
];