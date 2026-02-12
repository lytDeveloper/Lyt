import { supabase } from '../lib/supabase';
import type { ProjectFile } from '../types/exploreTypes';
import { getContentType } from '../utils/fileUtils';
import { activityService } from './activityService';

export type FileBucket = 'project-files' | 'collaboration-files';

export interface FileUploadResult {
  publicUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

export class FileUploadService {

  /**
   * Upload a file to Supabase storage
   *
   * @param file - The file to upload
   * @param entityId - The project or collaboration ID
   * @param entityType - 'project' or 'collaboration'
   * @param uploadedBy - Name of the user uploading
   * @param description - File description
   * @param sharedWith - 'all' for all team members, or array of member IDs
   * @returns ProjectFile object
   */
  static async uploadFile(
    file: File,
    entityId: string,
    entityType: 'project' | 'collaboration',
    uploadedBy: string,
    description?: string,
    sharedWith?: 'all' | string[]
  ): Promise<ProjectFile> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('사용자 인증이 필요합니다.');
      }

      // Determine bucket based on entity type
      const bucketName: FileBucket = entityType === 'project' ? 'project-files' : 'collaboration-files';
      const folderName = entityType === 'project' ? 'projects' : 'collaborations';

      // Generate file name with timestamp to avoid conflicts
      const timestamp = Date.now();
      const extension = file.name.split('.').pop();
      // Remove all non-ASCII characters (including Korean) and keep only safe characters
      const sanitizedFileName = file.name
        // eslint-disable-next-line no-control-regex
        .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII (including Korean)
        .replace(/[^a-zA-Z0-9._-]/g, '_') // Keep only safe characters
        .replace(/_{2,}/g, '_') // Replace multiple underscores with single
        .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores

      // If filename is empty or only extension, use timestamp
      const finalFileName = sanitizedFileName && sanitizedFileName !== `.${extension}`
        ? `${timestamp}-${sanitizedFileName}`
        : `${timestamp}.${extension}`;

      const storagePath = `${folderName}/${entityId}/${finalFileName}`;

      // Get Content-Type for the file
      const contentType = getContentType(file);

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: contentType,
        });

      if (uploadError) {
        console.error('[FileUploadService] Upload error:', uploadError);
        throw new Error(`파일 업로드 실패: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(storagePath);

      // Get file type for display
      const fileType = this.getFileType(file.name);

      const normalizedDescription = description?.trim() || undefined;

      // Create ProjectFile object
      const projectFile: ProjectFile = {
        id: `file_${timestamp}`,
        name: file.name,
        url: publicUrl,
        type: fileType,
        size: file.size,
        uploadedAt: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        uploadedBy,
        uploadedById: user.id,
        description: normalizedDescription,
        sharedWith: sharedWith || 'all', // 기본값은 전체 팀원
      };

      // file_shared 활동 기록 (업로더 및 공유 대상자에게)
      try {
        // 프로젝트/협업 제목 조회
        let entityTitle = '';
        const tableName = entityType === 'project' ? 'projects' : 'collaborations';
        const { data: entityData } = await supabase
          .from(tableName)
          .select('title')
          .eq('id', entityId)
          .maybeSingle();
        entityTitle = entityData?.title || (entityType === 'project' ? '프로젝트' : '협업');

        // 업로더에게 활동 기록
        activityService
          .createActivityViaRPC({
            userId: user.id,
            activityType: 'file_shared',
            relatedEntityType: entityType,
            relatedEntityId: entityId,
            title: `${entityTitle}에서 파일을 공유했어요`,
            description: file.name,
            metadata: {
              file_name: file.name,
              file_type: fileType,
              file_size: file.size,
              shared_with: sharedWith || 'all',
            },
          })
          .catch((err) =>
            console.warn('[FileUploadService] Failed to record uploader activity:', err)
          );

        // 공유 대상자들에게도 활동 기록
        if (sharedWith && Array.isArray(sharedWith)) {
          // 특정 유저들에게 공유된 경우
          for (const recipientId of sharedWith) {
            if (recipientId !== user.id) {
              activityService
                .createActivityViaRPC({
                  userId: recipientId,
                  activityType: 'file_shared',
                  relatedEntityType: entityType,
                  relatedEntityId: entityId,
                  title: `${entityTitle}에서 파일 ${file.name}이 공유되었어요`,
                  description: uploadedBy,
                  metadata: {
                    file_name: file.name,
                    file_type: fileType,
                    file_size: file.size,
                    uploader_id: user.id,
                    uploader_name: uploadedBy,
                  },
                })
                .catch((err) =>
                  console.warn('[FileUploadService] Failed to record recipient activity:', err)
                );
            }
          }
        } else if (sharedWith === 'all' || !sharedWith) {
          // 전체 멤버에게 공유된 경우 - 멤버 조회 후 각각에게 활동 기록
          const membersTable = entityType === 'project' ? 'project_members' : 'collaboration_members';
          const entityColumn = entityType === 'project' ? 'project_id' : 'collaboration_id';

          const { data: members } = await supabase
            .from(membersTable)
            .select('user_id')
            .eq(entityColumn, entityId)
            .eq('status', 'active');

          if (members) {
            for (const member of members) {
              if (member.user_id !== user.id) {
                activityService
                  .createActivityViaRPC({
                    userId: member.user_id,
                    activityType: 'file_shared',
                    relatedEntityType: entityType,
                    relatedEntityId: entityId,
                    title: `${entityTitle}에서 파일 ${file.name}이 공유되었어요`,
                    description: uploadedBy,
                    metadata: {
                      file_name: file.name,
                      file_type: fileType,
                      file_size: file.size,
                      uploader_id: user.id,
                      uploader_name: uploadedBy,
                    },
                  })
                  .catch((err) =>
                    console.warn('[FileUploadService] Failed to record member activity:', err)
                  );
              }
            }
          }
        }
      } catch (activityError) {
        console.warn('[FileUploadService] Failed to record file_shared activities:', activityError);
      }

      return projectFile;
    } catch (error) {
      console.error('[FileUploadService] Upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload a file to Supabase storage for a specific project (backward compatibility)
   */
  static async uploadProjectFile(
    file: File,
    projectId: string,
    uploadedBy: string,
    description?: string,
    sharedWith?: 'all' | string[]
  ): Promise<ProjectFile> {
    return this.uploadFile(file, projectId, 'project', uploadedBy, description, sharedWith);
  }

  /**
   * Upload a file to Supabase storage for a specific collaboration
   */
  static async uploadCollaborationFile(
    file: File,
    collaborationId: string,
    uploadedBy: string,
    description?: string,
    sharedWith?: 'all' | string[]
  ): Promise<ProjectFile> {
    return this.uploadFile(file, collaborationId, 'collaboration', uploadedBy, description, sharedWith);
  }

  /**
   * Delete a file from Supabase storage
   *
   * @param entityId - The project or collaboration ID
   * @param entityType - 'project' or 'collaboration'
   * @param fileName - The file name to delete
   */
  static async deleteFile(
    entityId: string,
    entityType: 'project' | 'collaboration',
    fileName: string
  ): Promise<void> {
    try {
      const bucketName: FileBucket = entityType === 'project' ? 'project-files' : 'collaboration-files';
      const folderName = entityType === 'project' ? 'projects' : 'collaborations';

      const { error } = await supabase.storage
        .from(bucketName)
        .remove([`${folderName}/${entityId}/${fileName}`]);

      if (error) {
        console.error('[FileUploadService] Delete error:', error);
        throw new Error(`파일 삭제 실패: ${error.message}`);
      }
    } catch (error) {
      console.error('[FileUploadService] Delete failed:', error);
      throw error;
    }
  }

  /**
   * Delete a file from project storage (backward compatibility)
   */
  static async deleteProjectFile(projectId: string, fileName: string): Promise<void> {
    return this.deleteFile(projectId, 'project', fileName);
  }

  /**
   * Delete a file from collaboration storage
   */
  static async deleteCollaborationFile(collaborationId: string, fileName: string): Promise<void> {
    return this.deleteFile(collaborationId, 'collaboration', fileName);
  }

  /**
   * Download a file from its URL
   *
   * @param fileUrl - The public URL of the file
   * @param fileName - The name to save the file as
   */
  static async downloadFile(fileUrl: string, fileName: string): Promise<void> {
    try {
      // Fetch the file
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error('파일 다운로드에 실패했어요.');
      }

      // Get the blob
      const blob = await response.blob();

      // Create a temporary download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[FileUploadService] Download failed:', error);
      throw error;
    }
  }

  /**
   * Get file type icon/label from file extension
   *
   * @param fileName - File name with extension
   * @returns File type string
   */
  private static getFileType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';

    const typeMap: Record<string, string> = {
      pdf: 'pdf',
      doc: 'doc',
      docx: 'doc',
      xls: 'xls',
      xlsx: 'xls',
      ppt: 'ppt',
      pptx: 'ppt',
      jpg: 'image',
      jpeg: 'image',
      png: 'image',
      gif: 'image',
      svg: 'image',
      webp: 'image',
      zip: 'zip',
      rar: 'zip',
      '7z': 'zip',
      txt: 'txt',
      md: 'txt',
    };

    return typeMap[extension] || 'file';
  }

  /**
   * Format file size for display
   *
   * @param bytes - File size in bytes
   * @returns Formatted string (e.g., "1.5 MB")
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

// Export singleton instance
export const fileUploadService = FileUploadService;
