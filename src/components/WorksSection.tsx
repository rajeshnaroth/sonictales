import { Work } from '../data/works'
import { ImageWithFallback } from './figma/ImageWithFallback'
import { ArrowRight } from 'lucide-react'

interface WorksSectionProps {
  works: Work[]
  onWorkClick: (work: Work) => void
  title: string
  showSeeAll: boolean
  onSeeAllClick?: () => void
}

export function WorksSection({ works, onWorkClick, title, showSeeAll, onSeeAllClick }: WorksSectionProps) {
  const sortedWorks = [...works].sort((a, b) => b.year - a.year)
  
  return (
    <section className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <h2 className="text-4xl md:text-5xl mb-6">{title}</h2>
            <p className="text-white/60 text-lg max-w-2xl">
              {title === 'Featured Films' 
                ? 'A selection of our most compelling cinematic stories.'
                : 'A curated collection of visual narratives spanning music videos, commercials, and cinematic storytelling.'
              }
            </p>
          </div>
          
          {showSeeAll && onSeeAllClick && (
            <button
              onClick={onSeeAllClick}
              className="flex items-center space-x-2 text-white/60 hover:text-white transition-colors group"
            >
              <span>See All</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
        
        {/* Films grid - 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sortedWorks.map((work) => (
            <div
              key={work.id}
              onClick={() => onWorkClick(work)}
              className="group cursor-pointer"
            >
              <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4">
                <ImageWithFallback
                  src={work.thumbnail}
                  alt={work.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                
                {/* Category badge */}
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-black/70 backdrop-blur-sm rounded-full text-xs tracking-wide">
                    {work.category}
                  </span>
                </div>
                
                {/* Duration */}
                <div className="absolute bottom-4 right-4">
                  <span className="px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-xs">
                    {work.duration}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl group-hover:text-white/80 transition-colors">
                  {work.title}
                </h3>
                <div className="flex items-center space-x-3 text-sm text-white/50">
                  <span>{work.year}</span>
                  {(work.artist || work.client) && (
                    <>
                      <span>•</span>
                      <span>{work.artist || work.client}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}