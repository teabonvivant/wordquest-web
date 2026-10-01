"""R2 entry point. Original R1 helper is archived under originals/R1/tools/."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name('package_r2.py')),run_name="__main__")
