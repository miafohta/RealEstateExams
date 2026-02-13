"use client";

type Props = {
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;

  showActions: boolean;

  isPractice: boolean;
  onSaveExit: () => void;

  isLast: boolean;
  onSubmit: () => Promise<void> | void;
};

export default function ExamNav({
  canPrev,
  canNext,
  onPrev,
  onNext,
  showActions,
  isPractice,
  onSaveExit,
  isLast,
  onSubmit,
}: Props) {
  return (
    <div className="flex gap-2 items-center">
      <button
        type="button"
        className="btn btn-secondary"
        disabled={!canPrev}
        onClick={onPrev}
      >
        Prev
      </button>

      <button
        type="button"
        className="btn btn-primary"
        disabled={!canNext}
        onClick={onNext}
      >
        Next
      </button>

      {showActions && (
        <>
          {isPractice && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={onSaveExit}
            >
              Save &amp; Exit
            </button>
          )}

          {isLast && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onSubmit}
            >
              Submit
            </button>
          )}
        </>
      )}
    </div>
  );
}
