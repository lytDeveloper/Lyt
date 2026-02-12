import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Chip, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import { LightningLoader } from '../common';
import { StyledTextField } from '../../styles/onboarding/common.styles';
import { supabase } from '../../lib/supabase';
import { useCommonOnboardingStore } from '../../stores/onboarding/useCommonOnboardingStore';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';

type KeywordRow = { keyword: string | null; save_count?: number };

function normalizeKeyword(raw: string) {
  return (raw || '').trim().replace(/^#+/, '');
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(all: string[], exclude: Set<string>, count: number) {
  const candidates = all.filter((k) => !exclude.has(k));
  return shuffle(candidates).slice(0, count);
}

interface ActivityFieldKeywordPickerProps {
  activityField?: string;
  /** interests 배열 (팬 프로필용, activityField 대신 사용) */
  interests?: string[];
  maxSelection?: number;
  /** 추천 키워드 Chip 영역 표시 여부 (기본값: true) */
  showSuggestions?: boolean;
  /** "다른 키워드 보기" 링크 표시 여부 (기본값: true) */
  showRefresh?: boolean;
  /** 새로고침 클릭 없이도 항상 직접 입력 영역을 노출할지 여부 (기본값: false) */
  alwaysShowManualInput?: boolean;
  /** 선택된 키워드 칩 표시 여부 (기본값: true) */
  showSelectedChips?: boolean;
  /** 외부에서 관리하는 선택된 키워드 목록 (지정시 내부 store 대신 사용) */
  externalSelectedKeywords?: string[];
  /** 외부에서 키워드 추가 시 호출되는 콜백 */
  onKeywordAdd?: (keyword: string) => void;
  /** 외부에서 키워드 제거 시 호출되는 콜백 */
  onKeywordRemove?: (keyword: string) => void;
}

export default function ActivityFieldKeywordPicker({
  activityField,
  interests,
  maxSelection = 5,
  showSuggestions = true,
  showRefresh = true,
  alwaysShowManualInput = false,
  showSelectedChips = true,
  externalSelectedKeywords,
  onKeywordAdd,
  onKeywordRemove,
}: ActivityFieldKeywordPickerProps) {
  // 외부 상태가 있으면 외부 상태 사용, 없으면 내부 store 사용
  const storeSelectedKeywords = useCommonOnboardingStore((s) => s.selectedKeywords);
  const storeAddSelectedKeyword = useCommonOnboardingStore((s) => s.addSelectedKeyword);
  const storeRemoveSelectedKeyword = useCommonOnboardingStore((s) => s.removeSelectedKeyword);
  const clearSelectedKeywords = useCommonOnboardingStore((s) => s.clearSelectedKeywords);

  const isExternalMode = externalSelectedKeywords !== undefined;
  const selectedKeywords = isExternalMode ? externalSelectedKeywords : storeSelectedKeywords;

  const addSelectedKeyword = (keyword: string, options?: { max?: number }) => {
    if (isExternalMode && onKeywordAdd) {
      onKeywordAdd(keyword);
    } else {
      storeAddSelectedKeyword(keyword, options);
    }
  };

  const removeSelectedKeyword = (keyword: string) => {
    if (isExternalMode && onKeywordRemove) {
      onKeywordRemove(keyword);
    } else {
      storeRemoveSelectedKeyword(keyword);
    }
  };

  const prevFieldRef = useRef<string | null>(null);
  const prevInterestsRef = useRef<string>('');

  const [allKeywords, setAllKeywords] = useState<string[]>([]);
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [refreshClickCount, setRefreshClickCount] = useState(0);
  const [manualInput, setManualInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isUpserting, setIsUpserting] = useState(false);

  const showManualInput = alwaysShowManualInput || refreshClickCount >= 3;
  const atMax = maxSelection > 0 && selectedKeywords.length >= maxSelection;

  // activityField 또는 interests 변경 시: 선택 키워드/추천/직접입력 상태 초기화
  useEffect(() => {
    const currentKey = interests ? interests.sort().join(',') : activityField || '';

    if (!activityField && (!interests || interests.length === 0)) {
      prevFieldRef.current = null;
      prevInterestsRef.current = '';
      setAllKeywords([]);
      setSuggestedKeywords([]);
      setRefreshClickCount(0);
      setManualInput('');
      setDebouncedQuery('');
      setErrorMessage('');
      return;
    }

    const prev = prevFieldRef.current;
    const prevInterests = prevInterestsRef.current;
    const hasChanged = (interests && prevInterests !== currentKey) ||
      (!interests && prev !== activityField);

    if (hasChanged) {
      // 외부 모드가 아닐 때만 store 초기화
      if (!isExternalMode) {
        clearSelectedKeywords();
      }
      setSuggestedKeywords([]);
      setAllKeywords([]);
      setRefreshClickCount(0);
      setManualInput('');
      setDebouncedQuery('');
      setErrorMessage('');
    }
    prevFieldRef.current = activityField || '';
    prevInterestsRef.current = currentKey;
  }, [activityField, interests, clearSelectedKeywords, isExternalMode]);

  // 분야별 또는 interests별 키워드 로드
  useEffect(() => {
    if (!activityField && (!interests || interests.length === 0)) return;

    let isMounted = true;
    const fetchKeywords = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        let allKeywordsData: KeywordRow[] = [];

        if (interests && interests.length > 0) {
          // interests 배열의 각 항목에 대해 키워드 조회
          const promises = interests.map(async (interest) => {
            const { data, error } = await supabase
              .from('activity_field_keywords')
              .select('keyword, save_count')
              .eq('activity_field', interest)
              .gte('save_count', 5);

            if (error) throw error;
            return data || [];
          });

          const results = await Promise.all(promises);
          allKeywordsData = results.flat();
        } else if (activityField) {
          // 기존 방식: activityField 하나만 사용
          const { data, error } = await supabase
            .from('activity_field_keywords')
            .select('keyword, save_count')
            .eq('activity_field', activityField)
            .gte('save_count', 5);

          if (error) throw error;
          allKeywordsData = data || [];
        }

        const normalized = allKeywordsData
          .map((row) => normalizeKeyword(row.keyword || ''))
          .filter(Boolean);

        // 중복 제거 및 정렬
        const unique = Array.from(new Set(normalized)).sort();

        if (!isMounted) return;
        setAllKeywords(unique);

        const exclude = new Set<string>(selectedKeywords.map(normalizeKeyword));
        setSuggestedKeywords(pickRandom(unique, exclude, 6));
      } catch (e) {
        console.error(e);
        if (!isMounted) return;
        setErrorMessage('키워드를 불러오지 못했어요.');
        setAllKeywords([]);
        setSuggestedKeywords([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchKeywords();

    return () => {
      isMounted = false;
    };
    // selectedKeywords를 의존성에 넣으면 선택할 때마다 재-fetch가 발생하므로 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityField, interests]);

  // 입력 디바운스
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(manualInput), 200);
    return () => clearTimeout(t);
  }, [manualInput]);

  const filteredKeywords = useMemo(() => {
    const q = normalizeKeyword(debouncedQuery);
    if (!showManualInput || !q) return [];

    const qLower = q.toLowerCase();
    return allKeywords
      .filter((k) => k.toLowerCase().includes(qLower))
      .slice(0, 10);
  }, [allKeywords, debouncedQuery, showManualInput]);

  const handleRefresh = () => {
    const nextCount = refreshClickCount + 1;
    setRefreshClickCount(nextCount);

    const exclude = new Set<string>([
      ...selectedKeywords.map(normalizeKeyword),
      ...suggestedKeywords.map(normalizeKeyword),
    ]);

    const next = pickRandom(allKeywords, exclude, 6);
    setSuggestedKeywords(next);
  };

  const handleSelect = (keyword: string) => {
    if (atMax) return;
    addSelectedKeyword(keyword, { max: maxSelection });
  };

  const handleManualEnter = async () => {
    const fieldToUse = interests && interests.length > 0 ? interests[0] : activityField;
    if (!fieldToUse) return;
    if (atMax) return;

    const normalized = normalizeKeyword(manualInput);
    if (!normalized) return;

    setIsUpserting(true);
    try {
      // 먼저 존재 여부 확인 (interests가 있으면 첫 번째 interest 사용)
      const { data: existing, error: selectError } = await supabase
        .from('activity_field_keywords')
        .select('id, save_count')
        .eq('activity_field', fieldToUse)
        .eq('keyword', normalized)
        .maybeSingle();

      if (selectError) {
        throw selectError;
      }

      if (existing) {
        // 존재하면 save_count + 1
        const { error } = await supabase
          .from('activity_field_keywords')
          .update({ save_count: (existing.save_count || 0) + 1 })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // 없으면 save_count: 0으로 새로 생성
        const { error } = await supabase
          .from('activity_field_keywords')
          .insert({
            activity_field: fieldToUse,
            keyword: normalized,
            save_count: 0,
          });

        // primary key 충돌 (23505) 발생 시: sequence 문제일 수 있음
        // 재조회하여 실제로 존재하는지 확인 후 업데이트
        if (error) {
          if (error.code === '23505' && error.message?.includes('activity_field_keywords_pkey')) {
            // sequence 문제로 인한 primary key 충돌 가능성
            // 다시 조회하여 실제로 존재하는지 확인
            const { data: retryData, error: retrySelectError } = await supabase
              .from('activity_field_keywords')
              .select('id, save_count')
              .eq('activity_field', fieldToUse)
              .eq('keyword', normalized)
              .maybeSingle();

            if (retrySelectError) {
              throw retrySelectError;
            }

            if (retryData) {
              // 실제로 존재하므로 업데이트
              const { error: updateError } = await supabase
                .from('activity_field_keywords')
                .update({ save_count: (retryData.save_count || 0) + 1 })
                .eq('id', retryData.id);

              if (updateError) throw updateError;
            } else {
              // 존재하지 않는데 primary key 충돌: sequence 문제
              console.error('Primary key 충돌 발생 - sequence 문제 가능성:', {
                activityField: fieldToUse,
                keyword: normalized,
                error: error.message,
              });
              throw new Error('데이터베이스 sequence 문제가 발생했어요. 관리자에게 문의해주세요.');
            }
          } else {
            throw error;
          }
        }
      }

      // 선택에는 반영하지만 로컬 캐시(allKeywords)에는 추가하지 않음
      // (save_count < 5이므로 검색에 노출되지 않아야 함)
      addSelectedKeyword(normalized, { max: maxSelection });
      setManualInput('');
      setDebouncedQuery('');
    } catch (e) {
      console.error(e);
      alert('키워드 추가에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsUpserting(false);
    }
  };

  if (!activityField && (!interests || interests.length === 0)) return null;

  return (
    <Box sx={{ mt: 1 }}>
      <Typography sx={{ fontFamily: 'Pretendard, sans-serif', fontSize: 14, fontWeight: 500, mb: 1.5 }}>
        관련 키워드를 선택해주세요.
      </Typography>

      {isLoading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
          <LightningLoader size={18} />
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>키워드 불러오는 중…</Typography>
        </Box>
      ) : null}

      {errorMessage ? (
        <Typography sx={{ fontSize: 13, color: 'error.main', mb: 1 }}>{errorMessage}</Typography>
      ) : null}

      {/* 추천 키워드 6개 */}
      {showSuggestions ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {suggestedKeywords
            .filter((k) => !selectedKeywords.includes(k))
            .map((k) => (
              <Chip
                key={k}
                label={`#${k}`}
                onClick={() => handleSelect(k)}
                disabled={atMax}
                sx={{
                  height: 34,
                  borderRadius: '999px',
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 13,
                  backgroundColor: 'grey.100',
                }}
              />
            ))}
        </Box>
      ) : null}

      {/* 다른 키워드 보기 */}
      {showSuggestions && showRefresh ? (
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, justifyContent: 'center' }}>
            <RefreshRoundedIcon onClick={handleRefresh} sx={{ fontSize: 18, color: 'text.secondary', cursor: 'pointer' }} />
            <Typography
              onClick={handleRefresh}
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontSize: 13,
                color: 'text.secondary',
                cursor: 'pointer',
                width: 'fit-content',
                userSelect: 'none',
              }}
            >
              다른 키워드 보기
            </Typography>
          </Box>
          {/* 힌트: 직접 입력 input이 나타나기 전에만 표시 */}
          {!showManualInput ? (
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontSize: 11,
                color: 'text.disabled',
                mt: 0.5,
                textAlign: 'center',
              }}
            >
              세 번 누르면 직접 입력할 수 있어요.
            </Typography>
          ) : null}
        </Box>
      ) : null}

      {/* 3회 클릭 후: 직접 입력 + 검색 리스트 */}
      {showManualInput ? (
        <Box sx={{ mt: 1.5 }}>
          {filteredKeywords.length > 0 ? (
            <Box
              sx={{
                mb: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <List dense disablePadding>
                {filteredKeywords.map((k) => {
                  const isSelected = selectedKeywords.includes(k);
                  return (
                    <ListItemButton
                      key={k}
                      disabled={isSelected || atMax}
                      onClick={() => handleSelect(k)}
                    >
                      <ListItemText
                        primary={`#${k}`}
                        primaryTypographyProps={{
                          sx: { fontFamily: 'Pretendard, sans-serif', fontSize: 13 },
                        }}
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            </Box>
          ) : null}

          <StyledTextField
            placeholder="키워드 직접 입력"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleManualEnter();
              }
            }}
            disabled={isUpserting}
          />

          {atMax ? (
            <Typography sx={{ mt: 0.75, fontSize: 12, color: 'text.secondary' }}>
              키워드는 최대 {maxSelection}개까지 선택할 수 있어요.
            </Typography>
          ) : null}
        </Box>
      ) : null}

      {/* 선택된 키워드(파란 chip) */}
      {showSelectedChips && selectedKeywords.length > 0 ? (
        <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {selectedKeywords.map((k) => (
            <Chip
              key={k}
              label={`#${k}`}
              color="primary"
              onClick={() => removeSelectedKeyword(k)}
              onDelete={() => removeSelectedKeyword(k)}
              sx={{
                height: 34,
                borderRadius: '999px',
                fontFamily: 'Pretendard, sans-serif',
                fontSize: 13,
              }}
            />
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
