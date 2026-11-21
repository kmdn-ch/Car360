import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { VEHICLE_PHOTOS } from '../data/vehicleMedia';

export const VehicleGalleryModal: React.FC = () => {
  const { galleryIndex, openGallery, closeGallery } = useApp();

  const total = VEHICLE_PHOTOS.length;
  const isOpen = galleryIndex !== null && galleryIndex >= 0 && galleryIndex < total;

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeGallery();
      } else if (e.key === 'ArrowRight') {
        openGallery(((galleryIndex ?? 0) + 1) % total);
      } else if (e.key === 'ArrowLeft') {
        openGallery(((galleryIndex ?? 0) - 1 + total) % total);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, galleryIndex, total, openGallery, closeGallery]);

  if (!isOpen || galleryIndex === null) return null;

  const photo = VEHICLE_PHOTOS[galleryIndex];
  const goPrev = () => openGallery((galleryIndex - 1 + total) % total);
  const goNext = () => openGallery((galleryIndex + 1) % total);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Galerie véhicule : ${photo.title}`}
      onClick={closeGallery}
      className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 text-[#F5F5F7]"
    >
      {/* Barre supérieure */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="mx-auto w-full max-w-[1140px] flex items-center justify-between gap-4"
      >
        <div className="min-w-0">
          <h2 className="font-display text-base sm:text-lg font-semibold tracking-tight truncate">
            {photo.title}
          </h2>
          <p className="text-xs text-white/60 tabular-nums">
            {galleryIndex + 1} / {total}
          </p>
        </div>

        <button
          type="button"
          onClick={closeGallery}
          aria-label="Fermer la galerie"
          className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white hover:bg-white/15 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Image principale & navigation latérale */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative mx-auto flex w-full max-w-[1140px] flex-1 items-center justify-center py-4 min-h-0"
      >
        <button
          type="button"
          onClick={goPrev}
          aria-label="Photo précédente"
          className="absolute left-0 sm:left-2 z-10 inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/15 bg-black/60 text-white hover:bg-black/85 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <img
          src={photo.src}
          alt={photo.alt}
          className="max-h-[68vh] sm:max-h-[72vh] max-w-full rounded-md object-contain select-none"
        />

        <button
          type="button"
          onClick={goNext}
          aria-label="Photo suivante"
          className="absolute right-0 sm:right-2 z-10 inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/15 bg-black/60 text-white hover:bg-black/85 transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Légende + bande de vignettes */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="mx-auto w-full max-w-[1140px] space-y-3"
      >
        <p className="text-center text-xs sm:text-sm text-white/75">
          {photo.caption}
        </p>

        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-1">
          {VEHICLE_PHOTOS.map((item, idx) => {
            const active = idx === galleryIndex;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => openGallery(idx)}
                aria-label={`Afficher ${item.title}`}
                aria-current={active ? 'true' : undefined}
                className={`shrink-0 overflow-hidden rounded-[5px] aspect-[16/10] h-11 sm:h-12 transition-all ${
                  active
                    ? 'ring-2 ring-[#0066FF] opacity-100'
                    : 'opacity-50 hover:opacity-85 border border-white/15'
                }`}
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  className="h-full w-full object-cover"
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
