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
    <Card className="w-full h-[500px] bg-white relative overflow-hidden border border-gray-200">
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="#e5e5e5" />

      <div className="flex h-full flex-col md:flex-row">
        {/* Left content */}
        <div className="flex-1 p-8 relative z-10 flex flex-col justify-center">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900">
            {title}
          </h2>
          <p className="mt-4 text-gray-700 max-w-lg">{description}</p>
        </div>

        {/* Right content - Spline */}
        <div className="flex-1 relative min-h-[300px] md:min-h-0">
          <SplineScene scene={scene} className="w-full h-full" />
        </div>
      </div>
    </Card>
  );
}
