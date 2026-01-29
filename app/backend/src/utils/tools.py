import os
from pathlib import Path


class PathTools:
    """路径工具类

    提供项目中常用的路径操作方法
    """

    @classmethod
    def get_root_path(cls) -> Path:
        """获取项目根路径

        Returns:
            Path: 项目根路径
        """
        return Path(__file__).parent.parent

    @classmethod
    def get_userdata_path(cls, phone_number: str, media_type: str) -> Path:
        """获取user_data存储路径

        Returns:
            Path: user_data目录路径
        """
        user_data_path = Path.joinpath(cls.get_root_path(), 'statics', 'user_data', media_type, phone_number)
        os.makedirs(user_data_path, exist_ok=True)
        return user_data_path

    @classmethod
    def get_picture_path(cls) -> Path:
        """获取图片存储路径

        Returns:
            Path: 图片目录路径
        """
        return Path.joinpath(cls.get_root_path(), 'statics', 'picture')

    @classmethod
    def get_output_path(cls) -> Path:
        """获取输出文件存储路径

        Returns:
            Path: 输出目录路径
        """
        return Path.joinpath(cls.get_root_path(), "output")

    @classmethod
    def get_scrapy_path(cls) -> Path:
        """获取爬虫数据存储路径

        Returns:
            Path: 爬虫数据目录路径
        """
        return Path.joinpath(cls.get_output_path(), "scrapy")

    @classmethod
    def get_log_path(cls) -> Path:
        """获取日志存储路径

        Returns:
            Path: 日志目录路径
        """
        return Path.joinpath(cls.get_output_path(), "logs")

    @classmethod
    def get_tmp_path(cls) -> Path:
        tmp_path = Path.joinpath(cls.get_output_path(), "tmp")
        tmp_path.mkdir(parents=True, exist_ok=True)
        return tmp_path

    @classmethod
    def _clean_filename(cls, filename: str) -> str:
        """
        清理文件名中的特殊字符，使其适合文件系统
        Args:
            filename (str): 原始文件名
        Returns:
            str: 清理后的文件名
        """
        if not filename:
            return "unnamed"

        # 替换不间断空格为普通空格
        filename = filename.replace('\xa0', ' ')

        # 移除或替换Windows文件系统不允许的字符
        invalid_chars = ['<', '>', ':', '"', '|', '?', '*']
        for char in invalid_chars:
            filename = filename.replace(char, '_')

        # 替换路径分隔符
        filename = filename.replace('/', '_').replace('\\', '_')

        # 移除引号
        filename = filename.replace('"', '').replace("'", '')

        # 处理多余的空格和制表符
        filename = filename.replace('\t', ' ').replace('\n', ' ').replace('\r', ' ')
        filename = ' '.join(filename.split())  # 移除多余空格并trim

        # 替换其他控制字符和特殊Unicode字符
        cleaned_chars = []
        for char in filename:
            # 保留ASCII可打印字符、中文字符和常见符号
            if (32 <= ord(char) <= 126) or (0x4E00 <= ord(char) <= 0x9FFF) or char in ' .-_()[]{}':
                cleaned_chars.append(char)
            else:
                cleaned_chars.append('_')
        filename = ''.join(cleaned_chars)

        # 移除开头和结尾的点和空格（Windows不允许）
        filename = filename.strip('. ')

        # 处理Windows保留名称
        reserved_names = [
            'CON',
            'PRN',
            'AUX',
            'NUL',
            'COM1',
            'COM2',
            'COM3',
            'COM4',
            'COM5',
            'COM6',
            'COM7',
            'COM8',
            'COM9',
            'LPT1',
            'LPT2',
            'LPT3',
            'LPT4',
            'LPT5',
            'LPT6',
            'LPT7',
            'LPT8',
            'LPT9',
        ]

        # 检查是否是保留名称（不区分大小写）
        name_without_ext = os.path.splitext(filename)[0].upper()
        if name_without_ext in reserved_names:
            filename = f"_{filename}"

        # 限制文件名长度（Windows路径限制）
        if len(filename) > 200:
            name, ext = os.path.splitext(filename)
            # 保留扩展名，截断主文件名
            max_name_length = 200 - len(ext)
            filename = name[:max_name_length] + ext

        # 如果清理后为空，提供默认名称
        if not filename or filename.isspace():
            filename = "unnamed_file"

        return filename

if __name__ == '__main__':
    print(PathTools.get_root_path())
    print(PathTools.get_userdata_path('15768898201', 'xhs'))
