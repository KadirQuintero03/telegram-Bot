export interface PhotosEntry {
  name: string;
  type: 'directory' | 'file';
  path: string;
  size?: number;
  modifiedAt?: number;
  isFavorite?: boolean;
  isArchived?: boolean;
}

export interface PhotosResponse {
  currentPath: string;
  entries: PhotosEntry[];
}

export interface CreateAlbumInput {
  owner: string;
  title: string;
}

export interface AlbumSummary {
  id: string;
  title: string;
  path?: string;
  itemCount: number;
  coverPath?: string;
  createdAt: number;
}
