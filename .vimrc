" ---------- Basics ----------
set nocompatible              " disable old vi compatibility
filetype plugin indent on     " enable filetype detection, plugins & indent
syntax on                     " turn on syntax highlighting
set encoding=utf-8            " use UTF-8 as default encoding

" ---------- UI ----------
set number                     " show absolute line numbers
set cursorline                 " highlight current line
set nowrap                     " don't wrap long lines
set showmatch                  " briefly jump to matching bracket
set laststatus=2               " always show the statusline
set ruler                      " show line/column position
set wildmenu                   " enhanced command-line completion menu
set wildmode=longest:full,full " completion behavior in command mode

" Minimal statusline
set statusline=%f%m%r%h%w\ %=%l/%L:%c  " file info + cursor position

" ---------- Editing ----------
set tabstop=4                  " display width of a tab character
set shiftwidth=4               " indent size for autoindent/>>/<<
set expandtab                  " insert spaces instead of tab chars
set smartindent                " simple auto-indentation
set backspace=indent,eol,start " make backspace work properly in insert

" ---------- Search ----------
set ignorecase                 " case-insensitive search by default
set smartcase                  " switch to case-sensitive if pattern has caps
set incsearch                  " show matches as you type
set hlsearch                   " highlight all search matches

" ---------- Files ----------
set autoread                   " auto-reload file if changed externally
set hidden                     " allow buffer switching without saving

" Persistent undo
if has('persistent_undo')      " check if Vim supports persistent undo
  set undofile                  " save undo history to disk
  if !isdirectory($HOME . '/.vim/undo')
    call mkdir($HOME . '/.vim/undo', 'p', 0700) " create undo dir if missing
  endif
  set undodir^=$HOME/.vim/undo// " set undo directory
endif

" ---------- Quality of life ----------
set mouse=a                    " enable mouse support
if has('clipboard')            
  set clipboard^=unnamed,unnamedplus " use system clipboard
endif
set splitbelow                 " horizontal splits open below
set splitright                 " vertical splits open right
set timeoutlen=500             " shorter delay for mappings

" ---------- Colors ----------
colorscheme elflord             " set color scheme (try desert, elflord, evening, etc.)

" ---------- Mappings ----------
let mapleader = ","            " set leader key to comma
nnoremap <silent> <Space> :nohlsearch<CR> " space clears search highlights
nnoremap <leader>w :w<CR>      " ,w to save
nnoremap <leader>q :q<CR>      " ,q to quit

" Start plugin section
call plug#begin('~/.vim/plugged')

" File navigation
Plug 'preservim/nerdtree'

" Git integration
Plug 'tpope/vim-fugitive'

" Status/tab line
Plug 'vim-airline/vim-airline'

" Syntax and LSP
Plug 'neovim/nvim-lspconfig'
Plug 'nvim-treesitter/nvim-treesitter', {'do': ':TSUpdate'}

" Fuzzy finder
Plug 'junegunn/fzf', { 'do': { -> fzf#install() } }
Plug 'junegunn/fzf.vim'

call plug#end()
" End plugin section

