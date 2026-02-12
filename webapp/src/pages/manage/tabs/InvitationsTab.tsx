import { Box, Typography, useTheme, FormControlLabel, Switch } from '@mui/material';
import { styled } from '@mui/material/styles';
import TabBarBottomline from '../../../components/common/TabBarBottomline';
import type { TabItem } from '../../../components/common/TabBar';
import TalkRequestCard from '../../../components/manage/TalkRequestCard';
import InteractionCard from '../../../components/manage/InteractionCard';
import InvitationCard from '../../../components/manage/InvitationCard';
import type { TalkRequest } from '../../../types/talkRequest.types';
import type { Invitation } from '../../../types/invitation.types';
import type { ProjectApplication } from '../../../services/projectService';
import type { CollaborationApplication } from '../../../services/collaborationService';
import ArrowDropDownRoundedIcon from '@mui/icons-material/ArrowDropDownRounded';
import ChatIconImg from '../../../assets/icon/management/chat.png';
import ProposalIconImg from '../../../assets/icon/management/proposal.png';
import InviteIconImg from '../../../assets/icon/management/invite.png';
import EmptyStateIconImg from '../../../assets/icon/management/emptyState.png';

const INVITATION_FILTER_TABS: TabItem<'received' | 'sent'>[] = [
    { key: 'received', label: '받은 요청' },
    { key: 'sent', label: '보낸 요청' },
];

const MoreLink = styled(Typography)(({ theme }) => ({
    cursor: 'pointer',
    color: theme.palette.subText.default,
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1,
}));

const NotificationSwitch = styled(Switch)(({ theme }) => ({
    width: 30,
    height: 18,
    padding: 0,
    '& .MuiSwitch-switchBase': {
        padding: 0,
        margin: 3,
        transitionDuration: '200ms',
        '&.Mui-checked': {
            transform: 'translateX(12px)',
            color: '#fff',
            '& + .MuiSwitch-track': {
                backgroundColor: theme.palette.primary.main,
                opacity: 1,
            },
        },
    },
    '& .MuiSwitch-thumb': {
        width: 12,
        height: 12,
    },
    '& .MuiSwitch-track': {
        borderRadius: 26 / 2,
        backgroundColor: theme.palette.grey[200],
        opacity: 1,
    },
}));

type Application = ProjectApplication | CollaborationApplication;

interface InvitationsTabProps {
    invitationFilter: 'received' | 'sent';
    onFilterChange: (filter: 'received' | 'sent') => void;

    // 대화 요청 데이터
    receivedTalkRequests: TalkRequest[];
    sentTalkRequests: TalkRequest[];
    showHiddenReceivedTalkRequests: boolean;
    showHiddenSentTalkRequests: boolean;
    onShowHiddenReceivedTalkRequestsChange: (show: boolean) => void;
    onShowHiddenSentTalkRequestsChange: (show: boolean) => void;
    showAllReceivedTalkRequests: boolean;
    showAllSentTalkRequests: boolean;
    onShowAllReceivedTalkRequestsChange: (show: boolean) => void;
    onShowAllSentTalkRequestsChange: (show: boolean) => void;
    onTalkRequestSelect: (req: TalkRequest, mode: 'sent' | 'received') => void;
    onTalkRequestToggleHidden: (req: TalkRequest, mode: 'sent' | 'received') => void;

    // 지원 데이터
    receivedApplications: { items: Application[]; total: number };
    sentApplications: { items: Application[]; total: number };
    showHiddenReceivedApps: boolean;
    showHiddenSentApps: boolean;
    onShowHiddenReceivedAppsChange: (show: boolean) => void;
    onShowHiddenSentAppsChange: (show: boolean) => void;
    showAllReceivedApps: boolean;
    showAllSentApps: boolean;
    onShowAllReceivedAppsChange: (show: boolean) => void;
    onShowAllSentAppsChange: (show: boolean) => void;
    onApplicationViewDetail: (app: Application, mode: 'sent' | 'received') => void;
    onApplicationToggleHidden: (app: Application, mode: 'sent' | 'received') => void;
    onApplicationReject?: (app: Application) => void;
    onApplicationCancel?: (app: Application) => void;

    // 초대 데이터
    receivedInvitations: Invitation[];
    sentInvitations: Invitation[];
    showHiddenReceivedInvitations: boolean;
    showHiddenSentInvitations: boolean;
    onShowHiddenReceivedInvitationsChange: (show: boolean) => void;
    onShowHiddenSentInvitationsChange: (show: boolean) => void;
    showAllReceivedInvitations: boolean;
    showAllSentInvitations: boolean;
    onShowAllReceivedInvitationsChange: (show: boolean) => void;
    onShowAllSentInvitationsChange: (show: boolean) => void;
    onInvitationSelect: (invitation: Invitation, mode: 'sent' | 'received') => void;
    onInvitationToggleHidden: (invitation: Invitation, mode: 'sent' | 'received') => void;

    // 낙관적 UI
    locallyViewedIds: Set<string>;
    onMarkAsViewedLocally: (id: string) => void;
    onMarkTalkRequestAsViewed: (id: string) => void;
    onMarkApplicationAsViewed: (id: string, isProject: boolean) => void;
    onMarkInvitationAsViewed: (id: string) => void;
}

export default function InvitationsTab({
    invitationFilter,
    onFilterChange,
    // 대화 요청
    receivedTalkRequests,
    sentTalkRequests,
    showHiddenReceivedTalkRequests,
    showHiddenSentTalkRequests,
    onShowHiddenReceivedTalkRequestsChange,
    onShowHiddenSentTalkRequestsChange,
    showAllReceivedTalkRequests,
    showAllSentTalkRequests,
    onShowAllReceivedTalkRequestsChange,
    onShowAllSentTalkRequestsChange,
    onTalkRequestSelect,
    onTalkRequestToggleHidden,
    // 지원
    receivedApplications,
    sentApplications,
    showHiddenReceivedApps,
    showHiddenSentApps,
    onShowHiddenReceivedAppsChange,
    onShowHiddenSentAppsChange,
    showAllReceivedApps,
    showAllSentApps,
    onShowAllReceivedAppsChange,
    onShowAllSentAppsChange,
    onApplicationViewDetail,
    onApplicationToggleHidden,
    onApplicationReject,
    onApplicationCancel,
    // 초대
    receivedInvitations,
    sentInvitations,
    showHiddenReceivedInvitations,
    showHiddenSentInvitations,
    onShowHiddenReceivedInvitationsChange,
    onShowHiddenSentInvitationsChange,
    showAllReceivedInvitations,
    showAllSentInvitations,
    onShowAllReceivedInvitationsChange,
    onShowAllSentInvitationsChange,
    onInvitationSelect,
    onInvitationToggleHidden,
    // 낙관적 UI
    locallyViewedIds,
    onMarkAsViewedLocally,
    onMarkTalkRequestAsViewed,
    onMarkApplicationAsViewed,
    onMarkInvitationAsViewed,
}: InvitationsTabProps) {
    const theme = useTheme();

    return (
        <Box>
            <TabBarBottomline<'received' | 'sent'>
                tabs={INVITATION_FILTER_TABS}
                activeTab={invitationFilter}
                onTabChange={onFilterChange}
            />

            {invitationFilter === 'received' ? (
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {/* 1. 대화 요청 섹션 */}
                    <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                            <Typography sx={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box component="img" src={ChatIconImg} alt="대화 요청" sx={{ width: 30, height: 30, mr: 0.5 }} />
                                대화 요청 {receivedTalkRequests.length}
                            </Typography>
                            <FormControlLabel
                                sx={{ gap: 0.5 }}
                                control={
                                    <NotificationSwitch
                                        checked={showHiddenReceivedTalkRequests}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onShowHiddenReceivedTalkRequestsChange(e.target.checked)}
                                    />
                                }
                                label={<Typography sx={{ fontSize: 10 }}>숨김 항목</Typography>}
                            />
                        </Box>
                        {(receivedTalkRequests.length > 0 || showHiddenReceivedTalkRequests) && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {(showAllReceivedTalkRequests ? receivedTalkRequests : receivedTalkRequests.slice(0, 2)).map((req) => {
                                    const isNew = req.status === 'pending' && !req.viewedAt && !locallyViewedIds.has(req.id);
                                    return (
                                        <TalkRequestCard
                                            key={req.id}
                                            talkRequest={req}
                                            mode="received"
                                            isHidden={req.isHiddenByReceiver}
                                            onToggleHidden={() => onTalkRequestToggleHidden(req, 'received')}
                                            isNew={isNew}
                                            onSelect={() => {
                                                if (isNew) {
                                                    onMarkAsViewedLocally(req.id);
                                                    onMarkTalkRequestAsViewed(req.id);
                                                }
                                                onTalkRequestSelect(req, 'received');
                                            }}
                                        />
                                    );
                                })}
                                {receivedTalkRequests.length > 2 && !showAllReceivedTalkRequests && (
                                    <Box sx={{ textAlign: 'center', mt: 1, display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                                        <MoreLink variant="caption" onClick={() => onShowAllReceivedTalkRequestsChange(true)}>
                                            더 보기
                                        </MoreLink>
                                        <ArrowDropDownRoundedIcon sx={{ fontSize: '18px' }} />
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Box>

                    {/* 2. 받은 지원 섹션 */}
                    <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                            <Typography sx={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box component="img" src={ProposalIconImg} alt="받은 지원" sx={{ width: 30, height: 30, mr: 0.5 }} />
                                받은 지원 {receivedApplications.total}
                            </Typography>
                            <FormControlLabel
                                sx={{ gap: 0.5 }}
                                control={
                                    <NotificationSwitch
                                        checked={showHiddenReceivedApps}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onShowHiddenReceivedAppsChange(e.target.checked)}
                                    />
                                }
                                label={<Typography sx={{ fontSize: 10 }}>숨김 항목</Typography>}
                            />
                        </Box>
                        {(receivedApplications.total > 0 || showHiddenReceivedApps) && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {(showAllReceivedApps ? receivedApplications.items : receivedApplications.items.slice(0, 2)).map((app) => {
                                    const isProjectApp = 'projectId' in app;
                                    const appViewedAt = (app as any).viewedAt;
                                    const isNewApp = app.status === 'pending' && !appViewedAt && !locallyViewedIds.has(app.id);
                                    return (
                                        <InteractionCard
                                            key={`app-${app.id}`}
                                            type="application"
                                            mode="received"
                                            item={app}
                                            isHidden={app.isHiddenByReviewer}
                                            onToggleHidden={() => onApplicationToggleHidden(app, 'received')}
                                            isNew={isNewApp}
                                            onViewDetail={() => {
                                                if (isNewApp) {
                                                    onMarkAsViewedLocally(app.id);
                                                    onMarkApplicationAsViewed(app.id, isProjectApp);
                                                }
                                                onApplicationViewDetail(app, 'received');
                                            }}
                                            onReject={
                                                app.status === 'pending' && onApplicationReject
                                                    ? () => onApplicationReject(app)
                                                    : undefined
                                            }
                                        />
                                    );
                                })}
                                {receivedApplications.items.length > 2 && !showAllReceivedApps && (
                                    <Box sx={{ textAlign: 'center', mt: 1, display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                                        <MoreLink variant="caption" onClick={() => onShowAllReceivedAppsChange(true)}>
                                            더 보기
                                        </MoreLink>
                                        <ArrowDropDownRoundedIcon sx={{ fontSize: '18px' }} />
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Box>

                    {/* 3. 받은 초대 섹션 */}
                    <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                            <Typography sx={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box component="img" src={InviteIconImg} alt="받은 초대" sx={{ width: 30, height: 30, mr: 0.5 }} />
                                받은 초대 {receivedInvitations.length}
                            </Typography>
                            <FormControlLabel
                                sx={{ gap: 0.5 }}
                                control={
                                    <NotificationSwitch
                                        checked={showHiddenReceivedInvitations}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onShowHiddenReceivedInvitationsChange(e.target.checked)}
                                    />
                                }
                                label={<Typography sx={{ fontSize: 10 }}>숨김 항목</Typography>}
                            />
                        </Box>
                        {(receivedInvitations.length > 0 || showHiddenReceivedInvitations) && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {(showAllReceivedInvitations ? receivedInvitations : receivedInvitations.slice(0, 2)).map((invitation) => {
                                    const isNewInvitation = invitation.status === 'pending' && !invitation.viewedDate && !locallyViewedIds.has(invitation.id);
                                    return (
                                        <InvitationCard
                                            key={invitation.id}
                                            invitation={invitation}
                                            mode="received"
                                            isHidden={invitation.isHiddenByReceiver}
                                            onToggleHidden={() => onInvitationToggleHidden(invitation, 'received')}
                                            isNew={isNewInvitation}
                                            onSelect={() => {
                                                if (isNewInvitation) {
                                                    onMarkAsViewedLocally(invitation.id);
                                                    onMarkInvitationAsViewed(invitation.id);
                                                }
                                                onInvitationSelect(invitation, 'received');
                                            }}
                                        />
                                    );
                                })}
                                {receivedInvitations.length > 2 && !showAllReceivedInvitations && (
                                    <Box sx={{ textAlign: 'center', mt: 1, display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                                        <MoreLink variant="caption" onClick={() => onShowAllReceivedInvitationsChange(true)}>
                                            더 보기
                                        </MoreLink>
                                        <ArrowDropDownRoundedIcon sx={{ fontSize: '18px' }} />
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Box>

                    {/* Empty State */}
                    {receivedTalkRequests.length === 0 &&
                        receivedApplications.total === 0 &&
                        receivedInvitations.length === 0 &&
                        !showHiddenReceivedTalkRequests &&
                        !showHiddenReceivedApps &&
                        !showHiddenReceivedInvitations && (
                            <Box sx={{ py: 8, textAlign: 'center', color: theme.palette.text.secondary }}>
                                <Box component="img" src={EmptyStateIconImg} alt="표시할 항목이 없어요" sx={{ width: 70, height: 70 }} />
                                <Typography sx={{ fontWeight: 600, mb: 1, color: theme.palette.text.primary }}>표시할 항목이 없어요.</Typography>
                                <Typography sx={{ fontSize: 14, color: theme.palette.text.secondary }}>다양한 문의를 받아보세요.</Typography>
                            </Box>
                        )}
                </Box>
            ) : (
                // 보낸 요청 탭
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {/* 1. 대화 요청 섹션 */}
                    <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                            <Typography sx={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box component="img" src={ChatIconImg} alt="대화 요청" sx={{ width: 30, height: 30, mr: 0.5 }} />
                                대화 요청 {sentTalkRequests.length}
                            </Typography>
                            <FormControlLabel
                                sx={{ gap: 0.5 }}
                                control={
                                    <NotificationSwitch
                                        checked={showHiddenSentTalkRequests}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onShowHiddenSentTalkRequestsChange(e.target.checked)}
                                    />
                                }
                                label={<Typography sx={{ fontSize: 10 }}>숨김 항목</Typography>}
                            />
                        </Box>
                        {(sentTalkRequests.length > 0 || showHiddenSentTalkRequests) && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {(showAllSentTalkRequests ? sentTalkRequests : sentTalkRequests.slice(0, 2)).map((req) => (
                                    <TalkRequestCard
                                        key={req.id}
                                        talkRequest={req}
                                        mode="sent"
                                        isHidden={req.isHiddenBySender}
                                        onToggleHidden={() => onTalkRequestToggleHidden(req, 'sent')}
                                        onSelect={() => onTalkRequestSelect(req, 'sent')}
                                    />
                                ))}
                                {sentTalkRequests.length > 2 && !showAllSentTalkRequests && (
                                    <Box sx={{ textAlign: 'center', mt: 1, display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                                        <MoreLink variant="caption" onClick={() => onShowAllSentTalkRequestsChange(true)}>
                                            더 보기
                                        </MoreLink>
                                        <ArrowDropDownRoundedIcon sx={{ fontSize: '18px' }} />
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Box>

                    {/* 2. 보낸 지원 섹션 */}
                    <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                            <Typography sx={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box component="img" src={ProposalIconImg} alt="보낸 지원" sx={{ width: 30, height: 30, mr: 0.5 }} />
                                보낸 지원 {sentApplications.total}
                            </Typography>
                            <FormControlLabel
                                sx={{ gap: 0.5 }}
                                control={
                                    <NotificationSwitch
                                        size="small"
                                        checked={showHiddenSentApps}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onShowHiddenSentAppsChange(e.target.checked)}
                                    />
                                }
                                label={<Typography sx={{ fontSize: 10 }}>숨김 항목</Typography>}
                            />
                        </Box>
                        {(sentApplications.total > 0 || showHiddenSentApps) && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {(showAllSentApps ? sentApplications.items : sentApplications.items.slice(0, 2)).map((app) => {

                                    return (
                                        <InteractionCard
                                            key={`app-${app.id}`}
                                            type="application"
                                            mode="sent"
                                            item={app}
                                            isHidden={app.isHiddenByApplicant}
                                            onToggleHidden={() => onApplicationToggleHidden(app, 'sent')}
                                            onViewDetail={() => onApplicationViewDetail(app, 'sent')}
                                            onCancel={
                                                app.status === 'pending' && onApplicationCancel
                                                    ? () => onApplicationCancel(app)
                                                    : undefined
                                            }
                                        />
                                    );
                                })}
                                {sentApplications.items.length > 2 && !showAllSentApps && (
                                    <Box sx={{ textAlign: 'center', mt: 1, display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                                        <MoreLink variant="caption" onClick={() => onShowAllSentAppsChange(true)}>
                                            더 보기
                                        </MoreLink>
                                        <ArrowDropDownRoundedIcon sx={{ fontSize: '18px' }} />
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Box>

                    {/* 3. 보낸 초대 섹션 */}
                    <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                            <Typography sx={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box component="img" src={InviteIconImg} alt="보낸 초대" sx={{ width: 30, height: 30, mr: 0.5 }} />
                                보낸 초대 {sentInvitations.length}
                            </Typography>
                            <FormControlLabel
                                sx={{ gap: 0.5 }}
                                control={
                                    <NotificationSwitch
                                        checked={showHiddenSentInvitations}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onShowHiddenSentInvitationsChange(e.target.checked)}
                                    />
                                }
                                label={<Typography sx={{ fontSize: 10 }}>숨김 항목</Typography>}
                            />
                        </Box>
                        {(sentInvitations.length > 0 || showHiddenSentInvitations) && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {(showAllSentInvitations ? sentInvitations : sentInvitations.slice(0, 2)).map((invitation) => (
                                    <InvitationCard
                                        key={invitation.id}
                                        invitation={invitation}
                                        mode="sent"
                                        isHidden={invitation.isHiddenBySender}
                                        onToggleHidden={() => onInvitationToggleHidden(invitation, 'sent')}
                                        onSelect={() => onInvitationSelect(invitation, 'sent')}
                                    />
                                ))}
                                {sentInvitations.length > 2 && !showAllSentInvitations && (
                                    <Box sx={{ textAlign: 'center', mt: 1, display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                                        <MoreLink variant="caption" onClick={() => onShowAllSentInvitationsChange(true)}>
                                            더 보기
                                        </MoreLink>
                                        <ArrowDropDownRoundedIcon sx={{ fontSize: '18px' }} />
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Box>

                    {/* Empty State */}
                    {sentTalkRequests.length === 0 &&
                        sentApplications.total === 0 &&
                        sentInvitations.length === 0 &&
                        !showHiddenSentTalkRequests &&
                        !showHiddenSentApps &&
                        !showHiddenSentInvitations && (
                            <Box sx={{ py: 8, textAlign: 'center', color: theme.palette.text.secondary }}>
                                <Box component="img" src={EmptyStateIconImg} alt="표시할 항목이 없어요" sx={{ width: 70, height: 70 }} />
                                <Typography sx={{ fontWeight: 600, mb: 1, color: theme.palette.text.primary }}>표시할 항목이 없어요.</Typography>
                                <Typography sx={{ fontSize: 14, color: theme.palette.text.secondary }}>다양한 문의를 보내보세요.</Typography>
                            </Box>
                        )}
                </Box>
            )}
        </Box>
    );
}
