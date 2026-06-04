import React, { useState } from 'react'
// Place your logo at public/logo.png — it will be referenced at /logo.png
// (or at /Game-Hestia/logo.png once deployed to GitHub Pages)

export default function Logo({ size = 'md' }) {
  const [imgError, setImgError] = useState(false)

  const sizes = {
    sm: { height: 32, fontSize: 18 },
    md: { height: 56, fontSize: 26 },
    lg: { height: 80, fontSize: 36 },
  }

  const { height, fontSize } = sizes[size] || sizes.md

  if (imgError) {
    return (
      <div className="logo-wrap" style={{ height }}>
        <span className="logo-placeholder" style={{ fontSize }}>
          HESTIA
        </span>
      </div>
    )
  }

  return (
    <div className="logo-wrap" style={{ height }}>
      <img
        src="logo.png"
        alt="Hestia"
        className="logo-img"
        style={{ height, maxWidth: '100%' }}
        onError={() => setImgError(true)}
      />
    </div>
  )
}
