import { Button } from "./ui/button";
import { ArrowLeft } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface AboutSectionProps {
  onBack: () => void;
}

export function AboutSection({ onBack }: AboutSectionProps) {
  return (
    <div className="pt-24 pb-20 px-6 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-8 text-white/60 hover:text-white hover:bg-white/5 p-0"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* Company Image */}
          <div className="w-80 h-80 bg-gray-900 rounded-2xl overflow-hidden mb-12">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1666558891537-467edb11a80b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaWxtJTIwcHJvZHVjdGlvbiUyMHRlYW0lMjBtZWV0aW5nfGVufDF8fHx8MTc1ODg2NTgzNHww&ixlib=rb-4.1.0&q=80&w=1080"
              alt="SonicTales production team"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Company Name and Tagline */}
          <div className="mb-12">
            <h1 className="text-5xl mb-6">SonicTales</h1>
            <h2 className="text-2xl text-white/70 mb-4">
              Independent Film Production
            </h2>
          </div>

          {/* Founder Bio */}
          <div className="space-y-6 text-white/80 leading-relaxed mb-16 max-w-3xl">
            <p>
              Rajesh Naroth is an indie filmmaker and sound
              designer based in San Jose, CA, and the founder of
              the production company SonicTales. He began his
              career in the industry composing music and
              producing music videos, and quickly expanded into
              writing and directing short films.
            </p>
            <p>
              Rajesh has collaborated closely with composer Enis
              Rothoff and contributed his expertise in sound
              design to Hollywood films, including Trigger
              Warning. His films have been screened at festivals
              worldwide. His one-minute short Status Change has
              been featured in over 23 festivals and won three
              awards, while his short film Max has achieved
              international acclaim, screening at more than 60
              festivals and earning eight Best Film awards.
            </p>
            <p>
              Through SonicTales, Rajesh continues to create
              compelling narrative short films and immersive
              audio experiences that explore the complexities of
              the human experience.
            </p>
          </div>

          {/* Company Info and Specialties */}
          <div className="grid md:grid-cols-2 gap-12 w-full max-w-4xl mb-16">
            <div>
              <h3 className="text-xl mb-6">Featured Films</h3>
              <div className="space-y-4 text-white/70 text-left">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white">
                      Status Change
                    </span>
                    <span className="text-sm">2015</span>
                  </div>
                  <p className="text-sm">
                    23 Festivals • 3 Awards
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white">Max</span>
                    <span className="text-sm">2016</span>
                  </div>
                  <p className="text-sm">
                    60+ Festivals • 8 Best Film Awards
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white">Canopy</span>
                    <span className="text-sm">2016</span>
                  </div>
                  <p className="text-sm">Drama Short Film</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl mb-6">Specialties</h3>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {[
                  "Short Films",
                  "Character Drama",
                  "Music Videos",
                  "Film Composition",
                  "Festival Submissions",
                  "Independent Cinema",
                  "Narrative Storytelling",
                ].map((specialty) => (
                  <span
                    key={specialty}
                    className="px-3 py-1 bg-white/10 rounded-full text-sm text-white/80"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <div className="flex justify-center">
              <a
                href="https://www.imdb.com/name/nm2564757/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M22.412 6.838a1.076 1.076 0 0 0-1.014-.838h-3.846l-1.077 8.962h1.846l.231-1.923h1.077c1.615 0 2.923-1.308 2.923-2.923V8.538c0-.615-.308-1.154-.77-1.7zM8.769 15.962H6.923L5.846 6h1.846l1.077 8.962zm7.385-8.962L15.077 15.962h-1.846L14.308 6h1.846zm-4.616 0L12.615 15.962h-1.846L11.846 6h1.692z" />
                </svg>
                Rajesh Naroth on IMDb
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}