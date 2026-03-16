import { SplineScene } from './spline-scene';
import { Card } from './card';
import { Spotlight } from './spotlight';

interface TechSplineSectionProps {
  title: string;
  description: string;
  scene?: string;
}

const DEFAULT_SCENE = 'https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode';

export function TechSplineSection({
  title,
  description,
  scene = DEFAULT_SCENE,
}: TechSplineSectionProps) {
  return (
    <Card className="w-full h-[500px] bg-black/[0.96] relative overflow-hidden border-0">
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />

      <div className="flex h-full flex-col md:flex-row">
        {/* Left content */}
        <div className="flex-1 p-8 relative z-10 flex flex-col justify-center">
          <h2 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
            {title}
          </h2>
          <p className="mt-4 text-neutral-300 max-w-lg">{description}</p>
        </div>

        {/* Right content - Spline */}
        <div className="flex-1 relative min-h-[300px] md:min-h-0">
          <SplineScene scene={scene} className="w-full h-full" />
        </div>
      </div>
    </Card>
  );
}
