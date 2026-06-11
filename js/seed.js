// ============================================================================
//  SEED — importe les 7 projets existants dans Firestore (une seule fois)
//  Appelé depuis l'admin via le bouton "Importer mes projets existants".
//  Les images/vidéos pointent vers les fichiers déjà présents dans assets/.
// ============================================================================
import { db } from "../firebase-config.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const T = (label) => ({ label, type: "code-skill" });
const E = (label) => ({ label, type: "editor-skill" });
const A = (label) => ({ label, type: "asset-skill" });

export const SEED_PROJECTS = [
  {
    slug: "blossom-anomaly",
    title: "Blossom Anomaly",
    subtitle: "Platformer genre game - C# & Unity",
    genre: "A fast-paced platformer with unique physics mechanics.",
    tags: [T("C#"), T("Git"), E("Unity")],
    cardBullets: ["Advanced Level Design", "Custom collision mathematical logic", "Dynamic Camera logic"],
    thumbnail: "assets/images/blossomanomaly.png",
    overview: "\"Blossom Anomaly\" delivers fast-paced platforming with a one-of-a-kind, physics-driven grapple hook mechanic, unlocking endless movement possibilities for players to master.",
    youtubeId: "",
    videoUrl: "assets/videos/blossom_anomaly.mp4",
    features: [
      { heading: "Level Design", text: "The game showcases two different levels with two different scales of difficulty", bullets: ["The tutorial is seamlessly integrated into the first level to keep the player immersed.", "Each level ramps up in difficulty, providing an ever-growing challenge to keep players fully engaged."] },
      { heading: "Collision Handling", text: "The collision system was built entirely using mathematical raycast logic to ensure precise, responsive, and controlled interactions.", bullets: ["Implemented eight-directional collision handling using Unity's Physics class and custom raycast logic for precise movement control.", "Player position is dynamically recalculated on collision to maintain consistent physics behavior and movement flow."] },
      { heading: "Camera custom behaviour", text: "The camera is designed to dynamically adjust based on the player's velocity and movement direction, ensuring smooth and responsive tracking.", bullets: ["The camera employs smooth damping to ensure clean and fluid movement throughout.", "The camera adjusts in real-time based on the player's velocity and direction, using dynamic conditions to ensure precise tracking."] }
    ],
    gallery: [
      "assets/images/blossomanomaly/blossom_anomaly_01.png",
      "assets/images/blossomanomaly/blossom_anomaly_02.png",
      "assets/images/blossomanomaly/blossom_anomaly_03.png",
      "assets/images/blossomanomaly/blossom_anomaly_04.png",
      "assets/images/blossomanomaly/blossom_anomaly_06.png",
      "assets/images/blossomanomaly/blossom_anomaly_07.png",
      "assets/images/blossomanomaly/blossom_anomaly_08.png",
      "assets/images/blossomanomaly/blossom_anomaly_09.png",
      "assets/images/blossomanomaly/blossom_anomaly_10.png",
      "assets/images/blossomanomaly/blossom_anomaly_11.png",
      "assets/images/blossomanomaly/blossom_anomaly_12.png"
    ],
    featured: true,
    order: 0
  },
  {
    slug: "shmupmarine",
    title: "ShmupMarine",
    subtitle: "Shoot Them Up Game - C# & Godot",
    genre: "Shoot 'Em Up",
    tags: [T("C#"), E("Godot"), A("Aseprite"), A("Photoshop")],
    cardBullets: ["State Machine Enemy AI", "Complex Bullet Patterns", "Multi-phase Boss design"],
    thumbnail: "assets/images/project1.png",
    overview: "\"ShmupMarine\" is a thrilling shoot-them-up game that challenges players to defeat waves of enemies while navigating complex patterns. Created using C# and Godot, this project emphasizes enemy AI behavior and engaging gameplay mechanics.",
    youtubeId: "",
    videoUrl: "assets/videos/shmupmarine-preview.mp4",
    features: [
      { heading: "Enemy AI", text: "The enemy AI is designed to challenge players with varying attack patterns and behaviors, ensuring a unique gameplay experience.", bullets: ["Utilizes a State Machine to control enemy states."] },
      { heading: "Bullet Patterns", text: "Players face dynamic and unique bullet patterns that changes for each enemy, keeping the gameplay engaging.", bullets: ["Implemented a system to randomize bullet trajectories for unpredictability.", "Different bullet types with varying speeds and effects add depth to combat."] },
      { heading: "Boss Design", text: "A unique boss fight at the end of the game to test the players skill.", bullets: ["The boss has a health bar and multiple attack phases, increasing difficulty over time.", "Visual and audio cues signal boss attacks, enhancing player awareness."] }
    ],
    gallery: [
      "assets/images/shmupmarine/shmupmarine_1.png",
      "assets/images/shmupmarine/shmupmarine_2.png",
      "assets/images/shmupmarine/shmupmarine_3.png"
    ],
    featured: false,
    order: 1
  },
  {
    slug: "tamashi-no-hashi",
    title: "Tamashi no Hashi",
    subtitle: "Sokoban Puzzle Game - C# & Godot",
    genre: "Co-op Sokoban Puzzle",
    tags: [T("C#"), T("Git"), E("Godot"), A("Procreate"), A("Photoshop")],
    cardBullets: ["2D Grid-based movement", "Team-based Git workflow", "Asset Creation"],
    thumbnail: "assets/images/project2.png",
    overview: "\"Tamashi no Hashi\" is a collaborative Sokoban puzzle game that challenges players to solve intricate puzzles through strategic item placement and movement. Developed with C# and Godot, the game emphasizes teamwork and spatial reasoning.",
    youtubeId: "",
    videoUrl: "assets/videos/tamashinohashi_gameplay.mp4",
    features: [
      { heading: "2D Grid-Based Movement", text: "The game features a grid-based movement system, allowing players to push and pull items within a fixed grid layout.", bullets: ["Player movement is constrained to the grid, ensuring precise control.", "No built in collision detection is used. Only Maths."] },
      { heading: "Asset Creation", text: "All assets were created in-house to ensure a cohesive art style and experience throughout the game.", bullets: ["Utilized Procreate and Krita for 3D modeling and animation.", "Textures and UI elements were designed with Photoshop."] },
      { heading: "Git Fundamentals", text: "This project was a group effort, utilizing Git for version control to manage collaboration and maintain project integrity.", bullets: ["Implemented branching strategies to facilitate feature development.", "Regular merges and pull requests maintained a clean codebase."] }
    ],
    gallery: [
      "assets/images/tamashinohashi/tamashi_no_hashi_1.png",
      "assets/images/tamashinohashi/tamashi_no_hashi_2.png",
      "assets/images/tamashinohashi/tamashi_no_hashi_3.png"
    ],
    featured: false,
    order: 2
  },
  {
    slug: "just-stop",
    title: "Just Stop!",
    subtitle: "One Button Game - C# & Godot",
    genre: "One Button Party Game",
    tags: [T("C#"), E("Godot"), A("Aseprite")],
    cardBullets: ["Local Multiplayer System", "Juicy UI Feedback", "Scalable Level Selector"],
    thumbnail: "assets/images/juststop/just_stop_1.png",
    overview: "\"Just Stop!\" is a one-button multiplayer game where players must respond quickly to on-screen feedbacks. Developed using C# and Godot, the game fosters competition and quick reflexes.",
    youtubeId: "",
    videoUrl: "assets/videos/juststop_gameplay.mp4",
    features: [
      { heading: "Local Multiplayer System", text: "The game supports local multiplayer gameplay, allowing friends to compete in real-time.", bullets: ["Implemented player input detection to capture simultaneous button presses.", "Score tracking for each player with dynamic UI updates."] },
      { heading: "Special Feature", text: "Each round the players have a short period of time to react and use the special acceleration feature.", bullets: ["Used a random timer to add challenge and unpredictability", "The turns in the game ensure that each player maintains a consistent speed to preserve the integrity of the game loop."] },
      { heading: "Scoreboard System", text: "The scoreboard tracks player scores and displays results at the end of each round.", bullets: ["Implemented a leaderboard to showcase high scores over multiple rounds.", "Real-time score updates maintain competitive spirit among players."] },
      { heading: "Juiciness", text: "The game was designed from the ground up to be as responsive and engaging as possible.", bullets: ["Used Godot's particle system to empower every player action", "A real work was made on the UI to make it clean, simple, juicy and responsive"] }
    ],
    gallery: [
      "assets/images/juststop/just_stop_1.png",
      "assets/images/juststop/just_stop_2.png",
      "assets/images/juststop/just_stop_3.png",
      "assets/images/juststop/just_stop_4.png"
    ],
    featured: false,
    order: 3
  },
  {
    slug: "echoes-below",
    title: "Echoes Below",
    subtitle: "3D Horror Game - Unity & Blender",
    genre: "3D Atmospheric Horror",
    tags: [T("C#"), E("Unity"), A("Blender")],
    cardBullets: ["Inventory System", "Interactable Object System", "Audio-synced Subtitles"],
    thumbnail: "assets/images/project4.png",
    overview: "\"Echoes Below\" is an immersive 3D horror game that challenges players with exploration and atmosphere design. Created using Unity and Blender. This project combines technical mechanics like inventory systems and interactable objects with a focus on suspenseful design.",
    youtubeId: "",
    videoUrl: "assets/videos/echoes_below-preview.mp4",
    features: [
      { heading: "Inventory System", text: "The inventory system allows players to collect and store items essential for progression. Each item has attributes like name, description and specific mechanics.", bullets: ["Built with C# hashs & lists to handle item attributes and quantities.", "Items can be interacted with in real-time via raycasting."] },
      { heading: "Door and Key System", text: "Doors require specific keys to open, enhancing exploration. This system uses Animator components for smooth door animations and a tagging system for easy object identification.", bullets: ["Custom key-lock mechanism that checks the player's inventory for the correct key.", "Doors are animated with Unity's Animator component, complete with audio cues.", "Locks can be added or removed to modify difficulty dynamically."] },
      { heading: "Interactable Objects System", text: "Players interact with various objects throughout the environment using a custom tagging system and raycasting. Scriptable events handle unique object responses.", bullets: ["Tag-based system identifies objects in the player's line of sight.", "Custom scriptable events allow each object to respond with different actions.", "Real-time prompts guide players to discover interactable elements."] },
      { heading: "Objective & Subtitles System", text: "The objectives and subtitle system enhances immersion, guiding players through their journey. Objectives update in real-time, while subtitles sync with game audio for narration.", bullets: ["Objective queue system manages player tasks with clear updates.", "Text is used for subtitles, with precise timing for audio synchronization.", "Objectives and subtitles add to the narrative experience, keeping players engaged."] }
    ],
    gallery: [
      "assets/images/echoes_below/echoes_below_1.png",
      "assets/images/echoes_below/echoes_below_2.png",
      "assets/images/echoes_below/echoes_below_3.png"
    ],
    featured: false,
    order: 4
  },
  {
    slug: "horrorush",
    title: "Horrorush",
    subtitle: "Puzzle Game Remake - C# & Unity",
    genre: "Puzzle Game Remake",
    tags: [T("C#"), T("Git"), E("Unity"), A("Blender"), A("Procreate")],
    cardBullets: ["Custom Vector-math Movement", "Mobile Input Support", "Procedural UI generation"],
    thumbnail: "assets/images/horrorush.png",
    overview: "\"Horrorush\" is a remake of an original puzzle game made by Two Tribes. The originality behind this remake lies in the custom sound design and the horror atmosphere.",
    youtubeId: "",
    videoUrl: "assets/videos/horrorush_gameplay.mp4",
    features: [
      { heading: "Cube Movement & Collision System", text: "The game features a unique gameplay mechanic where a cube has its own behavior based on the tile type.", bullets: ["Cube movement and rolling is written purely with vector math and Quaternion logic.", "No built-in physics engine used; custom raycast collision detection."] },
      { heading: "Mobile Ready (Android & iOS)", text: "The game was developed to handle mobile touch controls seamlessly.", bullets: ["Used Unity Input System to handle screen touches.", "Optimized performance for mobile architecture."] },
      { heading: "Scalable UI", text: "The button sections on the level UI were designed entirely via code.", bullets: ["Made level setup easy with the use of Scriptable Objects.", "Scriptable Objects automatically instantiate the correct button types and values on screen."] },
      { heading: "Asset Creation", text: "All assets were created in-house to ensure a cohesive art style.", bullets: ["Utilized Blender and Procreate for 3D modeling and texturing.", "UI elements were designed with Photoshop."] }
    ],
    gallery: [
      "assets/images/horrorush/01_MainMenu.png",
      "assets/images/horrorush/02_LevelSelector.png",
      "assets/images/horrorush/03_Stadium.png",
      "assets/images/horrorush/04_Portal_Purgatory.png",
      "assets/images/horrorush/05_Cascade.png",
      "assets/images/horrorush/06_Serpent's_Sigil.png"
    ],
    featured: false,
    order: 5
  },
  {
    slug: "slice-dungeon",
    title: "Slice Dungeon",
    subtitle: "Mobile free-to-play game with bosses & enemies — programmed in C# & Unity",
    genre: "2D Action Roguelike",
    tags: [T("C#"), T("Git"), E("Unity"), A("Blender")],
    cardBullets: ["Procedural Dungeon Generation", "Hand-drawn Animation", "Custom Slicing Mechanics"],
    thumbnail: "assets/images/slicedungeon.jpg",
    overview: "\"Slice Dungeon\" is a free-to-play mobile roguelite game where you face bosses and enemies that must be sliced. Each dungeon has enemies with unique effects, and you must slice them all to progress. Boss encounters come with special rules altering the dungeon's gameplay. The game features a card-based deck system with bonuses that change your strategy.",
    youtubeId: "",
    videoUrl: "assets/videos/slice_dungeon.mp4",
    features: [
      { heading: "Asset Creation", text: "All visual assets for \"Slice Dungeon\" were hand-drawn to create a unique and cohesive art style for the game.", bullets: ["Hand-drawn concept art defined the visual identity of the game and its various dungeons.", "Sprites were created for all enemies, bosses, and environmental elements with attention to clarity and readability.", "Animations were crafted frame-by-frame to ensure smooth and expressive movement."] },
      { heading: "Enemy Design", text: "Each enemy was designed with unique gameplay mechanics and visual distinction.", bullets: ["Concepts defined enemy shapes, colors, and distinctive effects to communicate their abilities clearly.", "Sprites and animations were hand-drawn to convey personality and clarity in combat.", "Enemy behavior was implemented in Unity to guarantee responsive and dynamic interactions."] },
      { heading: "Boss Design", text: "Bosses were designed to be visually striking and mechanically memorable.", bullets: ["Hand-drawn boss concepts focused on thematic coherence and visual impact.", "Boss sprites and animations were carefully crafted frame-by-frame for expressive encounters.", "Boss behavior included unique rules to alter dungeon gameplay and challenge the player."] }
    ],
    gallery: [
      "assets/images/slice_dungeon/slice_dungeon_01.jpg",
      "assets/images/slice_dungeon/screenshot 2.jpg",
      "assets/images/slice_dungeon/screenshot 3.jpg",
      "assets/images/slice_dungeon/screenshot 4.jpg",
      "assets/images/slice_dungeon/screenshot 5.jpg",
      "assets/images/slice_dungeon/screenshot 6.jpg"
    ],
    featured: false,
    order: 6
  }
];

// Écrit les 7 projets dans Firestore (idempotent : ré-exécuter ne crée pas de doublons).
export async function seedProjects() {
  let count = 0;
  for (const p of SEED_PROJECTS) {
    await setDoc(doc(db, "projects", p.slug), {
      // Défauts des champs récents (catégorie, jam, crédits) — surchargés si présents dans p
      category: "school", jam: "", credits: [],
      ...p,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    count++;
  }
  return count;
}
