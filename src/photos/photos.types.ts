export interface PhotosEntry {
  name: string;
  type: 'directory' | 'file';
  path: string;
  size?: number;
  modifiedAt?: number;
}

export interface PhotosResponse {
  currentPath: string;
  entries: PhotosEntry[];
}

export interface CreateAlbumInput {
  owner: string;
  title: string;
}
