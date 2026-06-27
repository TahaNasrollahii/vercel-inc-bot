import { memo } from 'react'

// A stone tablet — a framed content card with gothic depth.
export default memo(function GothicCard({ children, className = '', ...props }) {
  return (
    <div className={`gothic-card ${className}`} {...props}>
      <div className="gothic-card-border" aria-hidden="true" />
      <div className="gothic-card-content">{children}</div>
    </div>
  )
})
