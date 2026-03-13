import { icon } from '../../icons.js';

export function renderArtistUpload(user) {
    return `
    <div class="page-header">
      <h1>Upload Music</h1>
      <p>Share your latest tracks with your audience</p>
    </div>

    <div class="settings-card">
      <h3>1. Upload Audio File</h3>
      <div class="file-upload-zone" id="audio-upload-zone">
        ${icon('upload', 48)}
        <div class="upload-text">Drag & drop your audio file here, or click to browse</div>
        <div class="upload-hint">MP3, WAV, FLAC • Max 50MB</div>
      </div>
      <input type="file" id="audio-file-input" accept="audio/*" style="display: none;">
    </div>

    <div class="settings-card">
      <h3>2. Cover Artwork</h3>
      <div class="file-upload-zone" id="cover-upload-zone" style="padding: 2rem;">
        <div style="width: 120px; height: 120px; border-radius: var(--radius-md); background: var(--bg); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
          ${icon('fileMusic', 40)}
        </div>
        <div class="upload-text">Upload cover artwork</div>
        <div class="upload-hint">PNG, JPG • 1:1 Aspect Ratio recommended</div>
      </div>
      <input type="file" id="cover-file-input" accept="image/*" style="display: none;">
    </div>

    <div class="settings-card">
      <h3>3. Song Details</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
        <div class="form-group">
          <label class="form-label">Song Title *</label>
          <input class="form-input" type="text" placeholder="Enter song title"/>
        </div>
        <div class="form-group">
          <label class="form-label">Album</label>
          <input class="form-input" type="text" placeholder="Album name (optional)"/>
        </div>
        <div class="form-group">
          <label class="form-label">Genre *</label>
          <select class="form-select">
            <option value="">Select genre</option>
            <option>Pop</option>
            <option>Hip-Hop</option>
            <option>R&B</option>
            <option>Rock</option>
            <option>Electronic</option>
            <option>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Price (USD) *</label>
          <input class="form-input" type="number" min="0" step="0.01" placeholder="0.99"/>
        </div>
      </div>
      <div class="form-group" style="margin-top: 0.5rem;">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" placeholder="Tell listeners about this track..."></textarea>
      </div>
      <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
        <button class="btn btn-primary" onclick="window.handleUpload()">
          ${icon('upload', 18)} Upload Song
        </button>
        <button class="btn btn-secondary">Save as Draft</button>
      </div>
    </div>
  `;
}
