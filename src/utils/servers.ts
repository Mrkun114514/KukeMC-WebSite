export const SERVER_NAMES: Record<string, string> = {
  "all": "全部服务器",
  "kitbattle": "职业战争",
  "slime": "粘液空岛",
  "bedwars": "起床战争",
  "redstone": "纯净生存",
  "lobby": "大厅",
  "surret": "避暑山庄",
  "auth": "登录大厅",
  "funsurvival": "趣味生存",
  "bridgepractise": "搭路练习",
  "zombies": "僵尸末日",
  "creative": "创造家园",
  "murdermystery": "密室杀手"
};

export const getServerName = (serverId: string | null | undefined): string => {
  if (!serverId) return '未知';
  return SERVER_NAMES[serverId] || serverId;
};
