export const SkeletonLine = ({ width = '100%', height = '14px' }: { width?: string; height?: string }) => (
  <div className="skeleton" style={{ width, height, marginBottom: 8 }} />
);

export const SkeletonCard = () => (
  <div className="card">
    <SkeletonLine width="40%" height="18px" />
    <SkeletonLine width="70%" height="12px" />
    <SkeletonLine height="12px" />
  </div>
);

export const SkeletonSection = () => (
  <div className="section">
    <div className="section-header">
      <div>
        <SkeletonLine width="160px" height="16px" />
        <SkeletonLine width="260px" height="12px" />
      </div>
      <div className="skeleton" style={{width:108,height:34,borderRadius:6}} />
    </div>
  </div>
);
