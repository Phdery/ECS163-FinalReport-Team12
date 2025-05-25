/*
  US Salary Choropleth – D3 v7
*/

// 不再需要import语句，因为已在HTML中加载库
console.log("D3版本:", d3.version);
console.log("feature函数:", typeof topojson.feature);

//--------------------------------------------
// CONFIG
//--------------------------------------------
const width = 960,
      height = 600,
      warm = d3.interpolateOranges,
      cool = d3.interpolateGnBu,
      borderScale = d3.scaleLinear([20, 5000], [0.5, 4]); // sample → stroke-width

const svg = d3.select("#map")
  .attr("width", width)
  .attr("height", height)
  .style("background-color", "#f9f9f9") // 添加背景色以便看到边界
  .style("display", "block") // 确保显示模式正确
  .style("margin", "0 auto") // 居中显示
  .attr("viewBox", [0, 0, width, height]);

// 调试2: 检查SVG元素是否被选中
console.log("SVG元素:", svg.node());

// global store
window.store = window.store || {};

//--------------------------------------------
// LOAD DATA
//--------------------------------------------
Promise.all([
  d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"),
  d3.csv("salary_data_cleaned.csv", d => ({
      state: d.job_state.trim(), // 确保去除可能的空格
      avg: +d.avg_salary,
      title: d.job_title
  }))
]).then(([usTopo, rows]) => {
  // 检查CSV数据中的州缩写
  console.log("CSV中的州缩写列表:", [...new Set(rows.map(d => d.state))]);
  
  // 原有代码继续...
  // 调试3: 检查TopoJSON和CSV数据
  console.log("TopoJSON数据:", usTopo);
  console.log("CSV前10行:", rows.slice(0, 10));
  
  // Aggregate salary by state
  const byState = d3.group(rows, d => d.state);
  
  // 调试4: 检查按州分组的数据
  console.log("按州分组数据:", byState);
  
  // 调整州缩写数据格式，确保与CSV中保持一致 
  const stateStats = Array.from(byState, ([state, list]) => {
    return {
      state: state.trim(), // 确保去除可能的空格
      n: list.length,
      avg: d3.mean(list, d => d.avg)
    };
  });
  
  // 调试5: 检查州统计数据
  console.log("州统计数据:", stateStats);
  
  const nationalMedian = d3.median(stateStats, d => d.avg);
  console.log("全国薪资中位数:", nationalMedian);

  const salaryMap = new Map(stateStats.map(d => [d.state, d]));
  
  // 调试6: 检查薪资映射表
  console.log("薪资映射表:", Array.from(salaryMap.entries()).slice(0, 5));

  const states = topojson.feature(usTopo, usTopo.objects.states).features;
  
  // 调试7: 检查州地理特征数据
  console.log("州地理特征数据前5个:", states.slice(0, 5));
  
  // 调试8: 检查州ID与CSV中的state字段是否匹配
  console.log("第一个州的ID:", states[0].id);
  console.log("第一个州在salaryMap中是否存在:", salaryMap.has(states[0].id));
  
  // 创建一个FIPS代码到州缩写的映射表(示例，实际应完整)
  const fipsToAbbr = {
    "01":"AL", "02":"AK", "04":"AZ", "05":"AR", "06":"CA", 
    "08":"CO", "09":"CT", "10":"DE", "12":"FL", "13":"GA",
    "15":"HI", "16":"ID", "17":"IL", "18":"IN", "19":"IA",
    "20":"KS", "21":"KY", "22":"LA", "23":"ME", "24":"MD",
    "25":"MA", "26":"MI", "27":"MN", "28":"MS", "29":"MO",
    "30":"MT", "31":"NE", "32":"NV", "33":"NH", "34":"NJ",
    "35":"NM", "36":"NY", "37":"NC", "38":"ND", "39":"OH",
    "40":"OK", "41":"OR", "42":"PA", "44":"RI", "45":"SC",
    "46":"SD", "47":"TN", "48":"TX", "49":"UT", "50":"VT",
    "51":"VA", "53":"WA", "54":"WV", "55":"WI", "56":"WY"
  };

  // COLOR FUNCTION
  function stateColor(s) {
    // 使用FIPS码获取对应的州缩写
    const abbr = fipsToAbbr[s.id];
    
    // 使用缩写查找数据
    const rec = abbr ? salaryMap.get(abbr) : null;
    
    if (!rec) return "#ddd"; // 更明显的灰色
    
    const t = (rec.avg - nationalMedian) / nationalMedian; // relative diff
    // 使用更鲜明的颜色
    return t >= 0 ? d3.interpolateReds(Math.min(t, 1) * 0.7 + 0.3) : d3.interpolateBlues(Math.min(-t, 1) * 0.7 + 0.3);
  }

  //----------------------------------------
  // DRAW MAP
  //----------------------------------------
  // 添加一个黑色背景矩形作为参考
  svg.insert("rect", ":first-child")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "#f0f0f0");

  // 确保地图投影正确
  const projection = d3.geoAlbersUsa()
    .fitSize([width, height], topojson.feature(usTopo, usTopo.objects.states));
    
  const path = d3.geoPath().projection(projection);

  // 重新绘制地图
  svg.selectAll("path").remove(); // 移除现有路径

  svg.append("g")
    .selectAll("path")
    .data(states)
    .join("path")
      .attr("d", path) // 使用正确的投影路径
      .attr("fill", stateColor)
      .attr("stroke", "#333")
      .attr("stroke-width", 1.5) // 增加边框宽度使其更明显
      .attr("opacity", 1)
      .on("mouseover", function() {
        d3.select(this)
          .attr("stroke-width", 2)
          .attr("stroke", "#000");
      })
      .on("mouseout", function() {
        d3.select(this)
          .attr("stroke-width", 1.5)
          .attr("stroke", "#333");
      })
      .on("click", function(event, d) {
        // 获取州缩写
        const stateAbbr = fipsToAbbr[d.id];
        if (stateAbbr) {
          // 触发州选择事件
          const selectEvent = new CustomEvent("stateSelected", { 
            detail: { state: stateAbbr } 
          });
          document.dispatchEvent(selectEvent);
        }
      });
    
  // 添加调试矩形，如果能看到这个红色方块，说明SVG元素是可见的
  svg.append("rect")
    .attr("width", 50)
    .attr("height", 50)
    .attr("x", 10)
    .attr("y", 10)
    .attr("fill", "red");

  // 调试用：保存状态到全局变量
  window.debugData = {
    states: states,
    byState: byState,
    stateStats: stateStats,
    fipsToAbbr: fipsToAbbr,
    usTopo: usTopo  // 添加这一行
  };
  
  console.log("地图渲染完成");
}).catch(error => {
  // 调试错误捕获
  console.error("加载数据出错:", error);
});

// 在绘制地图函数之后添加
// 检查地图路径是否真的被添加到DOM
setTimeout(() => {
  const paths = svg.selectAll("path").nodes();
  console.log(`实际创建的路径数量: ${paths.length}`);
  
  // 检查第一个路径元素的属性
  if (paths.length > 0) {
    const firstPath = d3.select(paths[0]);
    console.log("第一个路径的填充色:", firstPath.attr("fill"));
    console.log("第一个路径的描边颜色:", firstPath.attr("stroke"));
    console.log("第一个路径的描边宽度:", firstPath.attr("stroke-width"));
    console.log("第一个路径的不透明度:", firstPath.attr("opacity"));
    console.log("第一个路径的d属性:", firstPath.attr("d").substring(0, 50) + "...");
  }
}, 1000);

//--------------------------------------------
// STYLE (could be moved to CSS)
//--------------------------------------------
const style = document.createElement("style");
style.textContent = `
  .map-tooltip{background:#fff;border:1px solid #ccc;padding:6px 10px;border-radius:4px;font:12px sans-serif;}
  path.selected{stroke:#000;stroke-width:4px !important;}
`;
document.head.appendChild(style);

// 全局调试函数
window.debugMap = {
  showStateMappings: () => {
    if (!window.debugData) {
      console.error("尚未加载数据");
      return;
    }
    
    const mappings = window.debugData.states.map(s => {
      const abbr = window.debugData.fipsToAbbr[s.id];
      const hasData = window.debugData.byState.has(abbr);
      return {fips: s.id, abbr, hasData};
    });
    
    console.table(mappings);
  }
};
