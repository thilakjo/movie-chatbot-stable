import { NextResponse } from "next/server";

// Popular movies database for search
const MOVIE_DATABASE = [
  // Romance
  "La La Land",
  "The Notebook",
  "500 Days of Summer",
  "Eternal Sunshine of the Spotless Mind",
  "Before Sunrise",
  "Crazy Rich Asians",
  "The Proposal",
  "Notting Hill",
  "When Harry Met Sally",
  "Pretty Woman",
  "Sleepless in Seattle",
  "You've Got Mail",
  "Titanic",
  "Romeo + Juliet",

  // Action
  "Mad Max: Fury Road",
  "John Wick",
  "The Dark Knight",
  "Mission: Impossible - Fallout",
  "Die Hard",
  "The Matrix",
  "Gladiator",
  "Braveheart",
  "The Avengers",
  "Black Panther",
  "Wonder Woman",
  "Captain America: The Winter Soldier",
  "Top Gun: Maverick",
  "Mission: Impossible",

  // Comedy
  "The Grand Budapest Hotel",
  "Superbad",
  "Shaun of the Dead",
  "The Big Lebowski",
  "Groundhog Day",
  "Bridesmaids",
  "The Hangover",
  "21 Jump Street",
  "Deadpool",
  "Guardians of the Galaxy",
  "The Lego Movie",
  "Zootopia",
  "The Princess Bride",
  "Monty Python and the Holy Grail",

  // Drama
  "The Shawshank Redemption",
  "Forrest Gump",
  "The Green Mile",
  "Schindler's List",
  "12 Angry Men",
  "The Godfather",
  "Goodfellas",
  "The Departed",
  "Fight Club",
  "American Beauty",
  "The Social Network",
  "Spotlight",
  "Pulp Fiction",
  "The Silence of the Lambs",

  // Thriller
  "Se7en",
  "Gone Girl",
  "Zodiac",
  "Prisoners",
  "The Usual Suspects",
  "Memento",
  "Inception",
  "The Prestige",
  "Shutter Island",
  "Gone Baby Gone",
  "Mystic River",
  "The Sixth Sense",

  // Sci-Fi
  "Blade Runner 2049",
  "Arrival",
  "Ex Machina",
  "Interstellar",
  "The Martian",
  "District 9",
  "Moon",
  "Her",
  "Looper",
  "Source Code",
  "Edge of Tomorrow",
  "Inception",

  // Horror
  "Get Out",
  "Hereditary",
  "The Witch",
  "A Quiet Place",
  "It Follows",
  "The Babadook",
  "The Conjuring",
  "Insidious",
  "Sinister",
  "The Descent",
  "28 Days Later",
  "The Cabin in the Woods",

  // Adventure
  "Indiana Jones and the Raiders of the Lost Ark",
  "Jurassic Park",
  "The Mummy",
  "National Treasure",
  "The Goonies",
  "The Princess Bride",
  "The NeverEnding Story",
  "Hook",
  "Jumanji",
  "The Mask of Zorro",
  "The Three Musketeers",
  "Robin Hood: Prince of Thieves",

  // Animation
  "Spirited Away",
  "Toy Story",
  "Finding Nemo",
  "The Lion King",
  "Frozen",
  "Moana",
  "Coco",
  "Inside Out",
  "Up",
  "Wall-E",
  "Ratatouille",
  "Monsters, Inc.",

  // Bollywood/Indian Cinema
  "3 Idiots",
  "Dangal",
  "PK",
  "Lagaan",
  "Rang De Basanti",
  "Swades",
  "Taare Zameen Par",
  "Queen",
  "Gully Boy",
  "Andhadhun",
  "Article 15",
  "Thappad",
  "Pink",
  "Masaan",

  // International
  "Parasite",
  "Oldboy",
  "The Handmaiden",
  "Train to Busan",
  "Memories of Murder",
  "Amélie",
  "The Intouchables",
  "La Haine",
  "Run Lola Run",
  "City of God",
  "Y Tu Mamá También",
  "Pan's Labyrinth",
  "The Lives of Others",
  "Downfall",
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.toLowerCase() || "";

    if (!query || query.length < 2) {
      return NextResponse.json({ movies: [] });
    }

    // Filter movies that match the query
    const matchingMovies = MOVIE_DATABASE.filter((movie) =>
      movie.toLowerCase().includes(query)
    ).slice(0, 10); // Limit to 10 results

    return NextResponse.json({
      movies: matchingMovies,
      query: query,
      totalFound: matchingMovies.length,
    });
  } catch (error) {
    console.error("Search movies error:", error);
    return NextResponse.json(
      { error: "Failed to search movies" },
      { status: 500 }
    );
  }
}
