'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function ImageGallery({ imageUrls, title }: { imageUrls: string[]; title: string }) {
  const [selectedImage, setSelectedImage] = useState(0);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border shadow-sm">
        <div className="relative h-96 w-full bg-muted">
          {imageUrls[selectedImage] ? (
            <Image
              src={imageUrls[selectedImage]}
              alt={title}
              fill
              className="object-contain p-8"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="w-full h-48 bg-muted flex items-center justify-center">
              <span className="text-muted-foreground text-sm">No image available</span>
            </div>
          )}
        </div>
      </div>

      {imageUrls.length > 1 && imageUrls[0] && (
        <div className="grid grid-cols-4 gap-2">
          {imageUrls.map((url, idx) => (
            <button
              type="button"
              key={idx}
              onClick={() => setSelectedImage(idx)}
              aria-label={`View image ${idx + 1} of ${imageUrls.length}`}
              aria-current={selectedImage === idx ? "true" : undefined}
              className={`relative h-20 border-2 rounded-lg overflow-hidden ${
                selectedImage === idx ? 'border-primary' : 'border-muted'
              }`}
            >
              <Image
                src={url}
                alt={`${title} - Image ${idx + 1}`}
                fill
                className="object-contain p-2"
                sizes="100px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
