import { useState, Fragment, useMemo } from 'react';
import { List, EditButton, ShowButton, DeleteButton } from '@refinedev/mui';
import {
  Stack,
  Box,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Typography,
  Chip,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

import { useData, Term, Edge } from '../../contexts/DataContext';

type TierFilter = 'all' | 1 | 2 | 3;

function TermRow({ term }: { term: Term }) {
  const [open, setOpen] = useState(false);
  const { getEdgesForTerm } = useData();
  const edges = getEdgesForTerm(term.id);

  const renderEdgeRow = (edge: Edge) => {
    const connectedTerm = edge.from_term_id === term.id
      ? { id: edge.to_term_id, name: edge.to_term_name }
      : { id: edge.from_term_id, name: edge.from_term_name };

    return (
      <TableRow key={edge.id} sx={{ '&:last-child td': { borderBottom: 0 } }}>
        <TableCell>{edge.id}</TableCell>
        <TableCell>{connectedTerm.name}</TableCell>
        <TableCell>{edge.keyword}</TableCell>
        <TableCell sx={{ maxWidth: 400 }}>{edge.description}</TableCell>
        <TableCell>
          <Chip
            label={edge.difficulty === 'easy' ? '易' : edge.difficulty === 'hard' ? '難' : '普'}
            color={edge.difficulty === 'easy' ? 'success' : edge.difficulty === 'hard' ? 'error' : 'default'}
            size="small"
          />
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Fragment>
      <TableRow sx={{ '& > *': { borderBottom: open ? 'unset' : undefined } }}>
        <TableCell padding="checkbox">
          <IconButton
            size="small"
            onClick={() => setOpen(!open)}
            disabled={edges.length === 0}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{term.id}</TableCell>
        <TableCell>{term.name}</TableCell>
        <TableCell>{term.category}</TableCell>
        <TableCell sx={{ maxWidth: 300 }}>{term.description}</TableCell>
        <TableCell>
          <Chip
            label={term.tier === 1 ? 'T1' : term.tier === 3 ? 'T3' : 'T2'}
            color={term.tier === 1 ? 'success' : term.tier === 3 ? 'error' : 'default'}
            size="small"
          />
        </TableCell>
        <TableCell>{edges.length}</TableCell>
        <TableCell>
          <Stack direction="row" spacing={1}>
            <ShowButton hideText recordItemId={term.id} />
            <EditButton hideText recordItemId={term.id} />
            <DeleteButton hideText recordItemId={term.id} />
          </Stack>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ m: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                「{term.name}」の関連用語 ({edges.length}件)
              </Typography>
              {edges.length === 0 ? (
                <Typography color="text.secondary">関連する用語がありません</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width={60}>ID</TableCell>
                      <TableCell width={150}>関連用語</TableCell>
                      <TableCell width={120}>キーワード</TableCell>
                      <TableCell>説明</TableCell>
                      <TableCell width={80}>難易度</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {edges.map(renderEdgeRow)}
                  </TableBody>
                </Table>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </Fragment>
  );
}

export function TermList() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');

  const { getTermsByTier, loading } = useData();

  const filteredTerms = useMemo(() => {
    return getTermsByTier(tierFilter);
  }, [getTermsByTier, tierFilter]);

  const paginatedTerms = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredTerms.slice(start, start + rowsPerPage);
  }, [filteredTerms, page, rowsPerPage]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: TierFilter) => {
    setTierFilter(newValue);
    setPage(0);
  };

  if (loading) {
    return (
      <List>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </List>
    );
  }

  return (
    <List>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tierFilter} onChange={handleTabChange}>
          <Tab label={`全部 (${getTermsByTier('all').length})`} value="all" />
          <Tab label={`T1 易 (${getTermsByTier(1).length})`} value={1} />
          <Tab label={`T2 普 (${getTermsByTier(2).length})`} value={2} />
          <Tab label={`T3 難 (${getTermsByTier(3).length})`} value={3} />
        </Tabs>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell>ID</TableCell>
              <TableCell>用語名</TableCell>
              <TableCell>カテゴリ</TableCell>
              <TableCell>説明</TableCell>
              <TableCell>Tier</TableCell>
              <TableCell>関連数</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedTerms.map((term) => <TermRow key={term.id} term={term} />)}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredTerms.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="表示件数:"
        />
      </TableContainer>
    </List>
  );
}
