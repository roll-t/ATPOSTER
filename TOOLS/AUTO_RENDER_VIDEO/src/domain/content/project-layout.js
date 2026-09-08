// Domain policy: today every video category stores projects in a flat folder.
// If a category later needs nesting, only this policy changes; no route or renderer branches.
export function needsCategorySubfolder() {
  return false;
}

export function getEffectiveFolderPath(folderPath, category) {
  return needsCategorySubfolder(category) ? `${category}/${folderPath}` : folderPath;
}
