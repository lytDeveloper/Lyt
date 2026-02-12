import { Box, Typography, List, ListItemButton, ListItemText, ListItemAvatar, Avatar, Divider, useTheme } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import PersonIcon from '@mui/icons-material/Person';
import HandshakeIcon from '@mui/icons-material/Handshake';
import type { GroupedSearchResults } from '../../types/search.types';

interface SearchResultsViewProps {
  results: GroupedSearchResults;
  onResultClick: (type: 'project' | 'partner' | 'collaboration', id: string) => void;
}

export default function SearchResultsView({ results, onResultClick }: SearchResultsViewProps) {
  const theme = useTheme();

  return (
    <>
      {/* Project Results */}
      {results.projects.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              fontSize: 16,
              mb: 1.5,
              color: theme.palette.text.secondary,
            }}
          >
            프로젝트
          </Typography>
          <List sx={{ p: 0 }}>
            {results.projects.map((project) => (
              <ListItemButton
                key={project.id}
                onClick={() => onResultClick('project', project.id)}
                sx={{ borderRadius: 1, mb: 0.5 }}
              >
                <ListItemAvatar>
                  {project.cover_image_url ? (
                    <Avatar src={project.cover_image_url} variant="rounded" />
                  ) : (
                    <Avatar variant="rounded" sx={{ bgcolor: '#EFF6FF' }}>
                      <FolderIcon sx={{ color: '#3B82F6' }} />
                    </Avatar>
                  )}
                </ListItemAvatar>
                <ListItemText
                  primary={project.title}
                  secondary={
                    project.description
                      ? project.description.length > 50
                        ? project.description.substring(0, 50) + '...'
                        : project.description
                      : '프로젝트'
                  }
                  primaryTypographyProps={{ fontWeight: 500 }}
                />
              </ListItemButton>
            ))}
          </List>
          <Divider sx={{ my: 2 }} />
        </Box>
      )}

      {/* Partner Results */}
      {results.partners.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              fontSize: 16,
              mb: 1.5,
              color: theme.palette.text.secondary,
            }}
          >
            파트너
          </Typography>
          <List sx={{ p: 0 }}>
            {results.partners.map((partner) => (
              <ListItemButton
                key={partner.profile_id}
                onClick={() => onResultClick('partner', partner.profile_id)}
                sx={{ borderRadius: 1, mb: 0.5 }}
              >
                <ListItemAvatar>
                  {partner.logo_image_url || partner.profile_image_url ? (
                    <Avatar
                      src={partner.logo_image_url || partner.profile_image_url}
                      variant="rounded"
                    />
                  ) : (
                    <Avatar variant="rounded" sx={{ bgcolor: '#F3E8FF' }}>
                      <PersonIcon sx={{ color: '#A855F7' }} />
                    </Avatar>
                  )}
                </ListItemAvatar>
                <ListItemText
                  primary={partner.name}
                  secondary={
                    partner.type === 'brand'
                      ? `브랜드 • ${partner.category || '카테고리 없음'}`
                      : partner.type === 'artist'
                        ? `아티스트 • ${partner.activity_field || '활동 분야 없음'}`
                        : '크리에이티브'
                  }
                  primaryTypographyProps={{ fontWeight: 500 }}
                />
              </ListItemButton>
            ))}
          </List>
          <Divider sx={{ my: 2 }} />
        </Box>
      )}

      {/* Collaboration Results */}
      {results.collaborations.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              fontSize: 16,
              mb: 1.5,
              color: theme.palette.text.secondary,
            }}
          >
            협업
          </Typography>
          <List sx={{ p: 0 }}>
            {results.collaborations.map((collab) => (
              <ListItemButton
                key={collab.id}
                onClick={() => onResultClick('collaboration', collab.id)}
                sx={{ borderRadius: 1, mb: 0.5 }}
              >
                <ListItemAvatar>
                  {collab.cover_image_url ? (
                    <Avatar src={collab.cover_image_url} variant="rounded" />
                  ) : (
                    <Avatar variant="rounded" sx={{ bgcolor: '#ECFDF5' }}>
                      <HandshakeIcon sx={{ color: '#10B981' }} />
                    </Avatar>
                  )}
                </ListItemAvatar>
                <ListItemText
                  primary={collab.title}
                  secondary={collab.brief_description}
                  primaryTypographyProps={{ fontWeight: 500 }}
                  secondaryTypographyProps={{
                    sx: {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                    },
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        </Box>
      )}
    </>
  );
}

