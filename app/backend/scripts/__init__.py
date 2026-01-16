# Deploy scripts package

import sys
from pathlib import Path

# 确保 scripts 目录在 Python 路径中，以便 ape run 能够正确导入
_scripts_dir = Path(__file__).parent
if str(_scripts_dir) not in sys.path:
    sys.path.insert(0, str(_scripts_dir))
